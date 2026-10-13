// Shared types for routes, kept apart from server.ts so routes
// do not import the server.
export interface Reply {
  status: number;
  body: unknown;
  type?: string; // defaults to JSON
}

export interface Route {
  method: 'GET' | 'POST';
  pattern: RegExp;
  handle: (params: string[], body: unknown) => Reply;
}

// Thrown by handlers to answer with a 4xx and a message the
// caller can act on.
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
