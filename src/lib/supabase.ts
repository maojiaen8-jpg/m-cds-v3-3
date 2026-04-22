import { createClient } from '@supabase/supabase-js'

// 1. 项目地址
const supabaseUrl = 'https://lhrkslumgcuilgqdcytm.supabase.co'

// 2. 你的 Anon Key
const supabaseAnonKey = 'sb_publishable_bm-pvrMUs-Iv0CpkkVURag_02Z6_BEd'

// 3. 创建并导出客户端
export const supabase = createClient(supabaseUrl, supabaseAnonKey)