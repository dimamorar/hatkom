import { NextResponse } from 'next/server';
import { getAllReferences } from '@/services/data.service';
import { errorResponse, successResponse } from '@/utils/api';
import { ErrorCode } from '@/types/api';

export async function GET() {
  try {
    const references = await getAllReferences();
    return NextResponse.json(successResponse(references));
  } catch (error) {
    console.error('Error fetching PP references:', error);
    return NextResponse.json(errorResponse('Internal Server Error', ErrorCode.INTERNAL_SERVER_ERROR));
  }
}