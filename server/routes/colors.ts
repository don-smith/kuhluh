import { Router, type Request, type Response } from 'express'

import * as db from '../db.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const color = await db.getColor()
  res.json(color)
})

router.get('/all', (_req: Request, res: Response) => {
  res.json(db.getColors())
})

router.post('/', async (req: Request, res: Response) => {
  const color = req.body.color as string
  try {
    await db.addColor(color)
    res.sendStatus(201)
  } catch (err) {
    res.status(500).send(err)
  }
})

export default router