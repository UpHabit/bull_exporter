import { Request, Response, NextFunction } from 'express';

export function handleError(err: Error, _req: Request, res: Response, _next: NextFunction) {
	const responseData = {
		err: (err && err.message) || 'Unknown error',
	};

	return res.send(responseData).status(500);
}
