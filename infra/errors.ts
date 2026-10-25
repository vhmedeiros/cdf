export class CustomError extends Error {
  action: string;
  statusCode: number;

  constructor({
    name,
    message,
    action,
    statusCode,
  }: {
    name?: string;
    message: string;
    action: string;
    statusCode: number;
  }) {
    super(message);
    this.name = name || this.constructor.name;
    this.action = action;
    this.statusCode = statusCode;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

export class InternalServerError extends CustomError {
  constructor({ cause, statusCode = 500 }: { cause?: unknown; statusCode?: number } = {}) {
    super({
      name: "InternalServerError",
      message: "Um erro interno não esperado aconteceu.",
      action: "Entre em contato com o suporte ou tente novamente mais tarde.",
      statusCode,
    });
    this.cause = cause;
  }
}

export class ServiceError extends CustomError {
  constructor({
    cause,
    message = "Serviço indisponível no momento.",
    action = "Verifique se o serviço está disponível.",
    statusCode = 503,
  }: {
    cause?: unknown;
    message?: string;
    action?: string;
    statusCode?: number;
  } = {}) {
    super({
      name: "ServiceError",
      message,
      action,
      statusCode,
    });
    this.cause = cause;
  }
}

export class ValidationError extends CustomError {
  constructor({
    message = "Dados inválidos enviados.",
    action = "Ajuste os dados enviados e tente novamente.",
    statusCode = 400,
  }: { message?: string; action?: string; statusCode?: number } = {}) {
    super({
      name: "ValidationError",
      message,
      action,
      statusCode,
    });
  }
}

export class NotFoundError extends CustomError {
  constructor({
    message = "Recurso não encontrado.",
    action = "Verifique se o parâmetro informado está correto.",
    statusCode = 404,
  }: { message?: string; action?: string; statusCode?: number } = {}) {
    super({
      name: "NotFoundError",
      message,
      action,
      statusCode,
    });
  }
}

export class UnauthorizedError extends CustomError {
  constructor({
    message = "Usuário não autenticado.",
    action = "Faça login para continuar.",
    statusCode = 401,
  }: { message?: string; action?: string; statusCode?: number } = {}) {
    super({
      name: "UnauthorizedError",
      message,
      action,
      statusCode,
    });
  }
}

export class ForbiddenError extends CustomError {
  constructor({
    message = "Você não tem permissão para executar esta ação.",
    action = "Verifique se você possui os privilégios necessários.",
    statusCode = 403,
  }: { message?: string; action?: string; statusCode?: number } = {}) {
    super({
      name: "ForbiddenError",
      message,
      action,
      statusCode,
    });
  }
}
