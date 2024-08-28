import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger';

function calcDuration(start: [number, number]): number {
	const diff = process.hrtime(start);
	return diff[0] * 1e3 + diff[1] * 1e-6;
}

export function logRequestDetails(req: Request, res: Response, next: NextFunction) {
	const start = process.hrtime();
	const id = uuid();
	const reqLog = logger.child({
		req,
		req_id: id,
	});

	res.on('finish', () => {
		const data = {
			res,
			duration: calcDuration(start),
		};
		reqLog.info(data, 'request finish');
	});

	res.on('close', () => {
		const data = {
			res,
			duration: calcDuration(start),
		};
		reqLog.warn(data, 'request socket closed');
	});

	return next();
}
