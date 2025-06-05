import { NextResponse } from 'next/server';
import { getAllEmissions } from '@/services/data.service';
import { errorResponse, successResponse } from '@/utils/api';
import { ErrorCode } from '@/types/api';

export async function GET() {
  try {
    const emissions = await getAllEmissions();
    return NextResponse.json(successResponse(emissions));
  } catch (error) {
    console.error('Error fetching emissions:', error);
    return NextResponse.json(errorResponse('Internal Server Error', ErrorCode.INTERNAL_SERVER_ERROR));
  }
}