import { Emission, PPSCCReferenceLine, Vessel } from "@/prisma/generated/prisma";

export async function getAllVessels(): Promise<Vessel[]> {
  const response = await fetch('/api/vessels');
  if (!response.ok) {
    throw new Error('Failed to fetch vessels');
  }

  const data = await response.json();

  return data.data;
} 

export async function getAllEmissions(): Promise<Emission[]> {
  const response = await fetch('/api/emissions');
  if (!response.ok) {
    throw new Error('Failed to fetch emissions');
  }

  const data = await response.json();

  return data.data;
}

export async function getAllReferences(): Promise<PPSCCReferenceLine[]> {
  const response = await fetch('/api/pp-reference');
  if (!response.ok) {
    throw new Error('Failed to fetch references');
  }

  const data = await response.json();

  return data.data;
}