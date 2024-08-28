import { Request, Response, NextFunction } from 'express';

export function setHeaders(_req: Request, res: Response, next: NextFunction) {
	res.header('Content-Security-Policy', `default-src 'none'; form-action 'none'`);
	res.header('X-Permitted-Cross-Domain-Policies', 'none');
	res.header('Pragma', 'no-cache');
	res.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
	res.header('Content-Type-Options', 'nosniff');
	res.header('XSS-Protection', '1; mode=block');

	return next();
}
