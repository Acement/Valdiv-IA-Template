export const ErrorCode = {
  MISSING_MESSAGE: "MISSING_MESSAGE",
  MESSAGE_TOO_LONG: "MESSAGE_TOO_LONG",
  OPENAI_TIMEOUT: "OPENAI_TIMEOUT",
  OPENAI_UNAVAILABLE: "OPENAI_UNAVAILABLE",
  OPENAI_BAD_RESPONSE: "OPENAI_BAD_RESPONSE",
  NETWORK_ERROR: "NETWORK_ERROR",
  UPSTREAM_ERROR: "UPSTREAM_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};

export const ErrorMessages = {
  [ErrorCode.MISSING_MESSAGE]: "Falta el parámetro 'message'.",
  [ErrorCode.MESSAGE_TOO_LONG]: "El mensaje supera el máximo permitido.",
  [ErrorCode.OPENAI_TIMEOUT]: "El modelo tardó demasiado en responder.",
  [ErrorCode.OPENAI_UNAVAILABLE]: "El servicio del modelo no está disponible.",
  [ErrorCode.OPENAI_BAD_RESPONSE]: "Respuesta inválida del modelo.",
  [ErrorCode.NETWORK_ERROR]: "Error de red al conectar con el servicio.",
  [ErrorCode.UPSTREAM_ERROR]: "Error al consultar el servicio externo.",
  [ErrorCode.INTERNAL_ERROR]: "Error interno del servidor.",
};