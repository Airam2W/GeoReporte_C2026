import { sleep } from 'k6'
import { loginUser, requireLoginCredentials, selectDepartments } from './helpers.js'

let authenticated = false

export const options = {
  vus: 1,
  duration: '10s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
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
