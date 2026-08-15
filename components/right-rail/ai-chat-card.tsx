"use client";

import { useState } from "react";
import { Bot, Send } from "lucide-react";
import type { AiChatSeed, ChatMessage } from "@/lib/types";

export function AiChatCard({ data }: { data: AiChatSeed }) {
  const [messages, setMessages] = useState<ChatMessage[]>(data.messages);
  const [input, setInput] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: trimmed, time },
      {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "Analyzing the latest chart data… I'll get back to you with a signal summary shortly.",
        time,
      },
    ]);
    setInput("");
  }

  return (
    <section className="card flex min-h-0 flex-col p-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[13px] font-semibold">
          <Bot className="size-4 text-accent-2" />
          AI Chat Assistant
        </h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted-2">
          <span className="size-1.5 rounded-full bg-positive" />
          Online
        </span>
      </div>

      <div className="mt-3 flex max-h-48 min-h-0 flex-col gap-2.5 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[85%] rounded-xl px-3 py-2 text-[12px] leading-relaxed ${
              msg.role === "user"
                ? "self-end rounded-br-sm bg-accent/20 text-foreground"
                : "self-start rounded-bl-sm border border-border bg-surface-2 text-muted"
            }`}
          >
            <p>{msg.content}</p>
            <span className="mt-1 block text-[9px] text-muted-2">{msg.time}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {data.suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-accent-2"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send(input);
          }}
          placeholder="Ask about a setup..."
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted-2 focus:border-accent/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => send(input)}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r from-accent to-accent-blue text-white transition-opacity hover:opacity-90"
          aria-label="Send message"
        >
          <Send className="size-3.5" />
        </button>
      </div>
    </section>
  );
}
