import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import prisma from '../prisma/client';
import { tenantContext } from '../utils/context';

export const apiAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    // Check both x-api-key header and Authorization: Bearer <key>
    let apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey && req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        // If it starts with our standard key prefix, treat it as an API key. We will use 'nx_' as prefix.
        if (token.startsWith('nx_')) {
            apiKey = token;
        }
    }

    if (!apiKey) {
        return res.status(401).json({ error: 'API Key is required. Please provide it via the x-api-key header.' });
    }

    // Hash the provided key to look it up in the database
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    try {
        const keyRecord = await prisma.apiKey.findUnique({
            where: { keyHash },
            include: { organization: true }
        });

        if (!keyRecord) {
            return res.status(401).json({ error: 'Invalid API Key.' });
        }

        // Update the last used timestamp asynchronously
        prisma.apiKey.update({
            where: { id: keyRecord.id },
            data: { lastUsedAt: new Date() }
        }).catch(e => console.error('Failed to update API key lastUsedAt', e));

        // Set req.user to an API-based pseudouser so controllers behave normally
        (req as any).user = {
            id: 'API_USER',
            role: 'DEV', // Or some other high level role, but we will bypass role checks mostly in new routes
            name: `${keyRecord.name} (API Key)`,
            organizationId: keyRecord.organizationId,
            rank: 100, 
            departmentId: null,
        };

        // Run the rest of the request within the tenant context
        tenantContext.run({
            organizationId: keyRecord.organizationId,
            userId: 'API_USER',
            role: 'API'
        }, () => {
            next();
        });

    } catch (error) {
        console.error('[API Auth Middleware] Error:', error);
        return res.status(500).json({ error: 'Internal server error validating API Key.' });
    }
};
