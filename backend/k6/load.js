import { sleep } from 'k6'
import { loginUser, requireLoginCredentials, selectDepartments } from './helpers.js'

const maxVus = Number(__ENV.K6_MAX_VUS || 25)
let authenticated = false

export const options = {
  stages: [
    { duration: '30s', target: Math.max(1, Math.floor(maxVus * 0.2)) },
    { duration: '1m', target: maxVus },
    { duration: '2m', target: maxVus },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    checks: ['rate>0.99'],
  },
}

export function setup() {
  requireLoginCredentials()
}

export default function () {
  if (!authenticated) {
    authenticated = loginUser()
    if (!authenticated) {
      return
    }
  }

  selectDepartments()
  sleep(1)
}
