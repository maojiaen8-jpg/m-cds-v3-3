import { createClient } from '@supabase/supabase-js'

// 这是你的 Supabase 项目地址
const supabaseUrl = 'https://lhrkslumgcuilgqdcytm.supabase.co'

// 这是你刚才复制的那个很长的 Anon Key
const supabaseAnonKey = 'sb_publishable_bm-pvrMUs-Iv0CpkkVURag_02Z6_BEd'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)