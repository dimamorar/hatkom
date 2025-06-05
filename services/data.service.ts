import { prisma } from '../lib/prisma';

export async function getAllVessels() {
  return prisma.vessel.findMany({
    select: {
      id: true,
      name: true,
      imoNo: true,
      vesselType: true,
      maxDeadWg: true,
    },
  });
}

export async function getAllEmissions() {
  return prisma.emission.findMany({
    select: {
      id: true,
      vesselId: true,
      fromUtc: true,
      toUtc: true,
      aerco2ew2w: true,
    },
    orderBy: {
      fromUtc: 'desc',
    },
  });
}

export async function getAllReferences() {
  return prisma.pPSCCReferenceLine.findMany({
    select: {
      id: true,
      category: true,
      vesselTypeId: true,
      size: true,
      traj: true,
      a: true,
      b: true,
      c: true,
      d: true,
      e: true,
    },
  });
}