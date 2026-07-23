export class AppointmentConflictError extends Error {
  constructor(message = "Horário indisponível para este barbeiro") {
    super(message);
    this.name = "AppointmentConflictError";
  }
}

export class OutsideAvailabilityError extends Error {
  constructor(message = "Horário fora da disponibilidade do barbeiro") {
    super(message);
    this.name = "OutsideAvailabilityError";
  }
}

export class InvalidServiceError extends Error {
  constructor(message = "Serviço inválido ou inativo") {
    super(message);
    this.name = "InvalidServiceError";
  }
}

export class PastDateError extends Error {
  constructor(message = "Não é possível agendar em uma data no passado") {
    super(message);
    this.name = "PastDateError";
  }
}

export class AppointmentNotFoundError extends Error {
  constructor(message = "Agendamento não encontrado") {
    super(message);
    this.name = "AppointmentNotFoundError";
  }
}

export class AppointmentAccessDeniedError extends Error {
  constructor(message = "Acesso negado") {
    super(message);
    this.name = "AppointmentAccessDeniedError";
  }
}

export class InvalidStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidStatusTransitionError";
  }
}

export class BarberNotFoundError extends Error {
  constructor(message = "Barbeiro não encontrado") {
    super(message);
    this.name = "BarberNotFoundError";
  }
}
