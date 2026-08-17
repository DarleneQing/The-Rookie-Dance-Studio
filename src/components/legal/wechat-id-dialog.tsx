'use client'

import { WeChatIcon } from '@/components/icons/social-icons'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export const WECHAT_ID = 'yyyuanfish'

interface WeChatIdDialogProps {
  children: React.ReactNode
}

export function WeChatIdDialog({ children }: WeChatIdDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl border-border/60 bg-popover p-0 shadow-2xl">
        <DialogHeader className="border-b border-border/40 px-5 pb-4 pt-5 text-left">
          <DialogTitle className="flex items-center gap-2 pr-12 font-syne text-xl leading-tight">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#07C160]/15 text-[#39d781]">
              <WeChatIcon className="h-5 w-5" />
            </span>
            WeChat
          </DialogTitle>
          <DialogDescription className="pl-10 font-outfit">
            Add The Rookie Dance Studio using the WeChat ID below.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 text-center">
          <p className="font-outfit text-xs uppercase tracking-[0.16em] text-muted-foreground">
            WeChat ID
          </p>
          <p className="mt-2 select-all font-syne text-2xl font-bold text-foreground">
            {WECHAT_ID}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
