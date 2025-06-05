import { NextResponse } from 'next/server';
import { getAllVessels } from '@/services/data.service';
import { errorResponse, successResponse } from '@/utils/api';
import { ErrorCode } from '@/types/api';

export async function GET() {
  try {
    const vessels = await getAllVessels();
    return NextResponse.json(successResponse(vessels));
  } catch (error) {
    console.error('Error fetching vessels:', error);
    return NextResponse.json(errorResponse('Internal Server Error', ErrorCode.INTERNAL_SERVER_ERROR));
  }
}