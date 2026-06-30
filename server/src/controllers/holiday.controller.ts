import { Request, Response } from 'express';
import prisma from '../prisma/client';

// Default Ghana public holidays 2026
const GHANA_HOLIDAYS_2026 = [
  { name: "New Year's Day", date: '2026-01-01' },
  { name: "Constitution Day", date: '2026-01-07' },
  { name: "Independence Day", date: '2026-03-06' },
  { name: "Eid al-Fitr", date: '2026-03-20' }, // Approximate
  { name: "Good Friday", date: '2026-04-03' },
  { name: "Easter Monday", date: '2026-04-06' },
  { name: "Labour Day", date: '2026-05-01' },
  { name: "Eid al-Adha", date: '2026-05-27' }, // Approximate
  { name: "Founders' Day", date: '2026-08-04' },
  { name: "Kwame Nkrumah Memorial Day", date: '2026-09-21' },
  { name: "Farmer's Day", date: '2026-12-04' },
  { name: "Christmas Day", date: '2026-12-25' },
  { name: "Boxing Day", date: '2026-12-26' },
];

export const getHolidays = async (req: Request, res: Response) => {
  try {  const year = parseInt(req.query.year as string) || new Date().getFullYear();
  const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
  const holidays = await prisma.publicHoliday.findMany({
    where: { organizationId, OR: [{ year }, { isRecurring: true }] },
    orderBy: { date: 'asc' }
  });
  res.json(holidays);
  } catch (err: any) {
    console.error('[holiday.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const addHoliday = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const holiday = await prisma.publicHoliday.create({
      data: { ...req.body, organizationId, date: new Date(req.body.date) }
    });
    res.status(201).json(holiday);
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};

export const deleteHoliday = async (req: Request, res: Response) => {
  try {
  const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
  const deleted = await prisma.publicHoliday.deleteMany({ where: { id: req.params.id, organizationId } });
  if (!deleted.count) return res.status(404).json({ error: 'Holiday not found' });
  res.status(204).send();
  } catch (err: any) {
    console.error('[holiday.controller.ts]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Internal server error' });
  }
};

export const seedGhanaHolidays = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user?.organizationId || 'mcb-ghana-tenant';
    const created = await prisma.publicHoliday.createMany({
      data: GHANA_HOLIDAYS_2026.map(h => ({
        organizationId,
        name: h.name,
        date: new Date(h.date),
        country: 'GH',
        isRecurring: false,
        year: 2026
      }))
    });
    res.json({ created: created.count, message: 'Ghana 2026 public holidays seeded' });
  } catch (e: any) { res.status(400).json({ error: e.message }); }
};
