// Validation error structure returned by Radarr/Sonarr APIs
export interface ValidationError {
  propertyName: string;
  errorMessage: string;
  attemptedValue: unknown;
  severity: "error" | "warning";
  errorCode: string;
  formattedMessageArguments: string[];
  formattedMessagePlaceholderValues: Record<string, unknown>;
}

function formatValidationErrors(errors: ValidationError[]): string {
  return errors
    .map((error) => `${error.propertyName}: ${error.errorMessage}`)
    .join(", ");
}

export class ValidationException extends Error {
  constructor(
    public readonly errors: ValidationError[],
    message?: string,
  ) {
    super(message || formatValidationErrors(errors));
    this.name = "ValidationException";
  }
}

export function isValidationErrorArray(
  data: unknown,
): data is ValidationError[] {
  if (!Array.isArray(data)) return false;
  return data.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "propertyName" in item &&
      "errorMessage" in item &&
      "errorCode" in item,
  );
}
