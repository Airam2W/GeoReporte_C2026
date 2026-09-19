import { supabase } from '../lib/supabase'
import router from '../router/index'

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    router.push('/dashboard')
  } else {
    router.push('/login')
  }
})

