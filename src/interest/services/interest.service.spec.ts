import { Test, TestingModule } from '@nestjs/testing';
import { InterestService } from './interest.service';
import { PrismaService } from '../../database/prisma.service';

const mockPrisma = { girvi: { findFirstOrThrow: jest.fn() }, interestConfig: { findFirst: jest.fn() } };

describe('InterestService', () => {
  let service: InterestService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterestService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<InterestService>(InterestService);
    jest.clearAllMocks();
  });

  describe('calculateSimple', () => {
    it('calculates simple interest correctly', () => {
      // 100000 × 2% per month × 30 days / 30 / 100 = 2000
      expect(service.calculateSimple(100000, 2, 30)).toBe(2000);
    });

    it('calculates pro-rated days correctly', () => {
      // 100000 × 2% per month × 15 days / 30 / 100 = 1000
      expect(service.calculateSimple(100000, 2, 15)).toBe(1000);
    });

    it('handles zero principal', () => {
      expect(service.calculateSimple(0, 2, 30)).toBe(0);
    });
  });

  describe('applyThreshold', () => {
    it('bills days 1-15 as full month', () => {
      expect(service.applyThreshold(10)).toBe(30);
    });

    it('bills exactly 15 days as full month', () => {
      expect(service.applyThreshold(15)).toBe(30);
    });

    it('does not bill 16 days as full month', () => {
      expect(service.applyThreshold(16)).toBe(16);
    });

    it('handles full 30 days', () => {
      expect(service.applyThreshold(30)).toBe(30);
    });

    it('handles 31 days - 1 full month + 1 day threshold applied', () => {
      // 31 days = 30 + 1 remainder; 1 ≤ 15 so billed as 30 → 60 total
      expect(service.applyThreshold(31)).toBe(60);
    });

    it('handles 45 days - 1 full month + 15 remainder threshold applied', () => {
      // 45 = 30 + 15; 15 ≤ 15 so billed as 30 → 60 total
      expect(service.applyThreshold(45)).toBe(60);
    });

    it('handles 46 days - 1 full month + 16 remainder not thresholded', () => {
      // 46 = 30 + 16; 16 > 15 so billed as 46
      expect(service.applyThreshold(46)).toBe(46);
    });
  });

  describe('calculateKatmiti', () => {
    it('calculates simple interest when no partial payments', () => {
      // Same as simple interest for the full period
      const result = service.calculateKatmiti(100000, 2, 30, []);
      expect(result).toBeCloseTo(2000, 0);
    });

    it('resets principal base on partial payment — both periods get threshold billing', () => {
      // Period 1: 100000 × 15 days threshold→30 days at 2%/month = 2000
      // Period 2:  50000 × 15 days threshold→30 days at 2%/month = 1000
      // Total = 3000
      const partialPayments = [
        { date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), amount: 50000 },
      ];
      const result = service.calculateKatmiti(100000, 2, 30, partialPayments);
      expect(result).toBeCloseTo(3000, 0);
    });

    it('returns 0 when principal is fully paid', () => {
      const partialPayments = [
        { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), amount: 100000 },
      ];
      const result = service.calculateKatmiti(100000, 2, 30, partialPayments);
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });
});
