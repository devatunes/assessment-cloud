import { BadRequestException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService', () => {
  let service: AssessmentsService;
  let assessmentRepository: any;
  let questionRepository: any;
  let queryBuilder: any;

  beforeEach(() => {
    queryBuilder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    questionRepository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    assessmentRepository = {
      create: jest.fn((a: unknown) => a),
      save: jest.fn().mockResolvedValue({ id: 'assessment-1' }),
      findOne: jest.fn().mockResolvedValue({ id: 'assessment-1', questions: [] }),
    };

    service = new AssessmentsService(assessmentRepository, questionRepository);
  });

  it('rechaza con BadRequestException si alguna pregunta seleccionada no existe', async () => {
    queryBuilder.getMany.mockResolvedValue([{ id: 'q1' }]); // solo 1 de las 2 pedidas

    await expect(
      service.create({ name: 'Test', questionIds: ['q1', 'q2'] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(assessmentRepository.save).not.toHaveBeenCalled();
  });

  it('crea el assessment cuando todas las preguntas existen', async () => {
    queryBuilder.getMany.mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);

    const result = await service.create({ name: 'Test', questionIds: ['q1', 'q2'] });

    expect(assessmentRepository.save).toHaveBeenCalled();
    expect(assessmentRepository.findOne).toHaveBeenCalled();
    expect(result.id).toBe('assessment-1');
  });
});
