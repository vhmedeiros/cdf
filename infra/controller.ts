import { NextApiRequest, NextApiResponse } from "next";
import { CustomError, InternalServerError } from "./errors";

function onErrorHandler(error: unknown, _req: NextApiRequest, res: NextApiResponse) {
  if (error instanceof CustomError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  console.error("Unhandled Error in API controller:", error);
  const publicError = new InternalServerError({ cause: error });
  return res.status(publicError.statusCode).json(publicError.toJSON());
}

function onNoMatchHandler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(405).json({
    name: "MethodNotAllowedError",
    message: "Método HTTP não permitido para este endpoint.",
    action: "Verifique o método HTTP utilizado.",
    status_code: 405,
  });
}

const controller = {
  errorHandlers: {
    onError: onErrorHandler,
    onNoMatch: onNoMatchHandler,
  },
};

export default controller;
