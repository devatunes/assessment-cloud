import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentVisibility, QuestionBank } from './entities/question-bank.entity';
import { QuestionBankItem } from './entities/question-bank-item.entity';
import { CreateQuestionBankDto } from './dto/create-question-bank.dto';
import { UpdateQuestionBankDto } from './dto/update-question-bank.dto';
import { AddQuestionsToBankDto } from './dto/add-questions-to-bank.dto';
import { QueryQuestionBanksDto } from './dto/query-question-banks.dto';
import { PaginatedResult, paginate } from '../common/paginated-result';

@Injectable()
export class QuestionBanksService {
  constructor(
    @InjectRepository(QuestionBank)
    private readonly bankRepository: Repository<QuestionBank>,
    @InjectRepository(QuestionBankItem)
    private readonly itemRepository: Repository<QuestionBankItem>,
  ) {}

  // Bancos propios + PÚBLICOS de cualquier organización (de solo lectura).
  async findAll(
    organizationId: string,
    query: QueryQuestionBanksDto,
  ): Promise<PaginatedResult<QuestionBank & { questionCount: number }>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const qb = this.bankRepository
      .createQueryBuilder('bank')
      .where('(bank.organization_id = :organizationId OR bank.visibility = :public)', {
        organizationId,
        public: ContentVisibility.PUBLIC,
      })
      .orderBy('bank.createdAt', 'DESC');

    const total = await qb.getCount();

    const banks = await qb
      .clone()
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    if (banks.length === 0) return paginate([], total, page, pageSize);

    const counts = await this.itemRepository
      .createQueryBuilder('item')
      .select('item.bank_id', 'bankId')
      .addSelect('COUNT(*)', 'count')
      .where('item.bank_id IN (:...ids)', { ids: banks.map((b) => b.id) })
      .groupBy('item.bank_id')
      .getRawMany<{ bankId: string; count: string }>();

    const countByBankId = new Map(counts.map((c) => [c.bankId, Number(c.count)]));

    const items = banks.map((bank) => ({ ...bank, questionCount: countByBankId.get(bank.id) ?? 0 }));

    return paginate(items, total, page, pageSize);
  }

  async findOne(organizationId: string, id: string): Promise<QuestionBank & { items: QuestionBankItem[] }> {
    const bank = await this.bankRepository.findOne({ where: { id } });

    if (!bank || (bank.organizationId !== organizationId && bank.visibility !== ContentVisibility.PUBLIC)) {
      throw new NotFoundException(`Banco ${id} no encontrado`);
    }

    const items = await this.itemRepository.find({
      where: { bankId: id },
      order: { addedAt: 'ASC' },
    });

    return { ...bank, items };
  }

  async create(organizationId: string, dto: CreateQuestionBankDto): Promise<QuestionBank> {
    return this.bankRepository.save(
      this.bankRepository.create({
        organizationId,
        name: dto.name,
        description: dto.description ?? null,
        visibility: dto.visibility ?? ContentVisibility.PRIVATE,
      }),
    );
  }

  async update(organizationId: string, id: string, dto: UpdateQuestionBankDto): Promise<QuestionBank> {
    const bank = await this.getOwnedBank(organizationId, id);

    Object.assign(bank, {
      name: dto.name ?? bank.name,
      description: dto.description ?? bank.description,
      visibility: dto.visibility ?? bank.visibility,
    });

    return this.bankRepository.save(bank);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    await this.getOwnedBank(organizationId, id);
    await this.bankRepository.delete({ id });
  }

  // Agregar es idempotente: preguntas ya presentes en el banco se ignoran
  // en vez de fallar (evita que el reclutador tenga que des-seleccionar
  // manualmente lo que ya había agregado antes).
  async addQuestions(organizationId: string, bankId: string, dto: AddQuestionsToBankDto): Promise<void> {
    await this.getOwnedBank(organizationId, bankId);

    const existing = await this.itemRepository.find({ where: { bankId } });
    const existingIds = new Set(existing.map((i) => i.questionId));
    const newIds = dto.questionIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) return;

    await this.itemRepository.save(
      newIds.map((questionId) => this.itemRepository.create({ bankId, questionId })),
    );
  }

  async removeQuestion(organizationId: string, bankId: string, questionId: string): Promise<void> {
    await this.getOwnedBank(organizationId, bankId);
    await this.itemRepository.delete({ bankId, questionId });
  }

  // Mutaciones exigen ser dueño — a diferencia de findOne/findAll, que
  // también permiten LEER bancos públicos de otras organizaciones.
  private async getOwnedBank(organizationId: string, id: string): Promise<QuestionBank> {
    const bank = await this.bankRepository.findOne({ where: { id } });

    if (!bank) {
      throw new NotFoundException(`Banco ${id} no encontrado`);
    }
    if (bank.organizationId !== organizationId) {
      throw new ForbiddenException('Este banco pertenece a otra organización');
    }

    return bank;
  }
}
