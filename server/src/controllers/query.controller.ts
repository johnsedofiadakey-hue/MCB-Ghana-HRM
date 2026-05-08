import { Request, Response } from 'express';
import prisma from '../prisma/client';

export const getEmployeeQueries = async (req: Request, res: Response) => {
  try {
    const queries = await prisma.employeeQuery.findMany({
      where: { employeeId: req.params.id },
      include: { issuedBy: { select: { fullName: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(queries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
};

export const createQuery = async (req: Request, res: Response) => {
  try {
    const { subject, description } = req.body;
    if (!subject || !description) return res.status(400).json({ error: 'Missing required fields' });

    const query = await prisma.employeeQuery.create({
      data: {
        employeeId: req.params.id,
        // @ts-ignore
        issuedById: req.user.id,
        subject,
        description
      },
      include: { issuedBy: { select: { fullName: true, role: true } } }
    });
    res.json(query);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to issue query' });
  }
};

export const updateQueryStatus = async (req: Request, res: Response) => {
  try {
    const { status, resolution } = req.body;
    const query = await prisma.employeeQuery.update({
      where: { id: req.params.id },
      data: { status, resolution },
      include: { issuedBy: { select: { fullName: true, role: true } } }
    });
    res.json(query);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update query' });
  }
};
