import path from 'node:path'

import cors from 'cors'
import express from 'express'

import colors from './routes/colors.js'

const server = express()

server.use(express.json())
server.use(cors({ origin: 'http://localhost:8080' }))
server.use(express.static(path.join(import.meta.dir, 'static')))
server.use('/color', colors)

export default server