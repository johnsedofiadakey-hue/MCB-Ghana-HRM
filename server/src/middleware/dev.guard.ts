import { Request, Response, NextFunction } from 'express';

export const devGuard = (req: Request, res: Response, next: NextFunction) => {
    const masterKey = req.headers['x-dev-master-key'];
    const envKey = process.env.DEV_MASTER_KEY;

    if (!envKey) {
        // Fallback or Error if not configured
        console.error("DEV_MASTER_KEY is not set in environment variables!");
        return res.status(500).json({ message: "Dev configuration error" });
    }

    if (masterKey === envKey) {
        next();
    } else {
        return res.status(403).json({ message: "Unauthorized: Invalid Dev Key" });
    }
};
