import { BadRequestException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let assessmentRepository: any;
  let questionRepository: any;
  let assessmentQuestionRepository: any;
  let queryBuilder: any;

  const ORG_A = 'org-a';
  const ORG_B = 'org-b';

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    questionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    assessmentRepository = {
      create: jest.fn((a: unknown) => a),
      save: jest.fn().mockResolvedValue({ id: 'assessment-1' }),
      findOne: jest.fn().mockResolvedValue({ id: 'assessment-1', name: 'Test', questions: [] }),
    };
    assessmentQuestionRepository = {
      delete: jest.fn().mockResolvedValue(undefined),
    };

    service = new AssessmentsService(assessmentRepository, questionRepository, assessmentQuestionRepository);
  });

  it('rechaza con BadRequestException si alguna pregunta seleccionada no existe', async () => {
    queryBuilder.getMany.mockResolvedValue([{ id: 'q1' }]); // solo 1 de las 2 pedidas

    await expect(
      service.create(ORG_A, { name: 'Test', questionIds: ['q1', 'q2'] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(assessmentRepository.save).not.toHaveBeenCalled();
  });

  it('crea el assessment cuando todas las preguntas existen', async () => {
    queryBuilder.getMany.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);

    const result = await service.create(ORG_A, { name: 'Test', questionIds: ['q1', 'q2'] });

    expect(assessmentRepository.save).toHaveBeenCalled();
    expect(assessmentRepository.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'assessment-1', organizationId: ORG_A } }),
    );
    expect(result.id).toBe('assessment-1');
  });

  it('filtra las preguntas por organización: no permite anexar preguntas de otra org (fuga cross-tenant)', async () => {
    // Simula que la pregunta "q2" existe pero pertenece a ORG_B: la query
    // (con el organizationId de ORG_A) solo devuelve "q1".
    queryBuilder.getMany.mockResolvedValue([{ id: 'q1' }]);

    await expect(
      service.create(ORG_A, { name: 'Test', questionIds: ['q1', 'q2'] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('organization_id'),
      expect.objectContaining({ organizationId: ORG_A }),
    );
  });

  it('update() borra las filas de assessment_question viejas antes de recrearlas', async () => {
    queryBuilder.getMany.mockResolvedValue([{ id: 'q1' }]);

    await service.update(ORG_A, 'assessment-1', { questionIds: ['q1'] });

    expect(assessmentQuestionRepository.delete).toHaveBeenCalledWith({ assessmentId: 'assessment-1' });
    expect(assessmentRepository.save).toHaveBeenCalled();
  });

  it('update() rechaza con BadRequestException si las preguntas nuevas no son usables', async () => {
    queryBuilder.getMany.mockResolvedValue([]); // ninguna existe/es usable

    await expect(
      service.update(ORG_A, 'assessment-1', { questionIds: ['q-ajena'] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(assessmentQuestionRepository.delete).not.toHaveBeenCalled();
  });
});
