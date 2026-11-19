import Markdown from 'react-markdown';

// Model answers are markdown. Links are shown as text only: answers in a
// replay can contain made-up URLs, and nobody should click them.
export function Answer({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-[13px] leading-[1.6] [&_code]:rounded [&_code]:bg-hover [&_code]:px-1 [&_code]:font-mono [&_code]:text-[12px] [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
      <Markdown components={{ a: ({ children }) => <span className="underline decoration-dotted">{children}</span>, img: () => null }}>
        {text}
      </Markdown>
    </div>
  );
}
