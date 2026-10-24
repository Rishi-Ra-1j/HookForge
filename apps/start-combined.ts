// Runs the API and the BullMQ worker in ONE process (for hosts with no free worker tier)
import './api/src/index'
import './worker/src/index'
