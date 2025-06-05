import { Code, ErrorCode } from "@/types/api";

type SuccessResponse<T> = {
  status: number;
  success: true;
  data: T;
}

type ErrorResponse = {
  status: number;
  success: false;
  error: {
    message: string;
  };
}

export function errorResponse(
  message: string,
  errorCode: ErrorCode
): ErrorResponse {
  const status =
    errorCode === ErrorCode.BAD_REQUEST
      ? Code.BAD_REQUEST
      : Code.INTERNAL_SERVER_ERROR;

  return {
    status,
    success: false,
    error: {
      message,
    },
  };
}

export function successResponse<T>(
  data: T,
  status: number = Code.OK
): SuccessResponse<T> {
  return {
    status,
    success: true,
    data,
  };
}