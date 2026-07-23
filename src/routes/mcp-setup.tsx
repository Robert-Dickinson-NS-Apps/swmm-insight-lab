import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, ExternalLink, Plug } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/mcp-setup")({
  head: () => ({
    meta: [
      { title: "Connect to /mcp — SWMM5+ Repo Explorer" },
      {
        name: "description",
        content:
          "Step-by-step guide for connecting ChatGPT, Claude, and Cursor to the SWMM5+ Repo Explorer MCP server at /mcp.",
      },
      { property: "og:title", content: "Connect to /mcp — SWMM5+ Repo Explorer" },
      {
        property: "og:description",
        content: "Wire ChatGPT, Claude, and Cursor to the SWMM5+ MCP server in a few steps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: McpSetupPage,
});

const TOOLS = [
  { name: "list_modules", desc: "List all Fortran modules, optionally filtered by subsystem." },
  { name: "get_module", desc: "Full metadata + dependencies for a single module." },
  { name: "search_modules", desc: "Case-insensitive substring search over module id/name/path." },
  { name: "fetch_module_source", desc: "Raw Fortran source of a module from GitHub." },
  { name: "download_module_bundle", desc: "Zip of a module plus its transitive `use` closure." },
  { name: "list_papers", desc: "Curated Hodges papers, optionally filtered by subsystem." },
  { name: "get_paper", desc: "Full metadata + DOI links for a single paper." },
];

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: (id: string, text: string) => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(id);
        setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
      });
    },
  };
}

function CodeBlock({ id, code }: { id: string; code: string }) {
  const { copied, copy } = useCopy();
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        size="sm"
        variant="outline"
        className="absolute right-2 top-2 h-7 px-2"
        onClick={() => copy(id, code)}
      >
        {copied === id ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        <span className="ml-1 text-xs">{copied === id ? "Copied" : "Copy"}</span>
      </Button>
    </div>
  );
}

function McpSetupPage() {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://swmm-insight-lab.lovable.app";
  const url = `${origin}/mcp`;
  const { copied, copy } = useCopy();

  const claudeJson = `{
  "mcpServers": {
    "swmm5plus": {
      "url": "${url}"
    }
  }
}`;

  const cursorJson = `{
  "mcpServers": {
    "swmm5plus": {
      "url": "${url}"
    }
  }
}`;

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <header className="space-y-3">
        <div className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-primary" />
          <Badge variant="secondary">MCP server</Badge>
          <Badge variant="outline">no auth</Badge>
        </div>
        <h1 className="font-display text-3xl">Connect an AI client to /mcp</h1>
        <p className="text-muted-foreground">
          This app publishes a public Model Context Protocol server at{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">/mcp</code>. Any MCP-capable
          client — ChatGPT, Claude, Cursor, or your own — can call the tools below without
          signing in.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your server URL</CardTitle>
          <CardDescription>Point every client below at this exact URL.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm">
              {url}
            </code>
            <Button variant="outline" size="sm" onClick={() => copy("url", url)}>
              {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-2">{copied === "url" ? "Copied" : "Copy"}</span>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Transport: Streamable HTTP (MCP 2025-06-18). No API key required.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="claude" className="space-y-4">
        <TabsList>
          <TabsTrigger value="claude">Claude Desktop</TabsTrigger>
          <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
          <TabsTrigger value="cursor">Cursor</TabsTrigger>
          <TabsTrigger value="curl">Raw / curl</TabsTrigger>
        </TabsList>

        <TabsContent value="claude" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Claude Desktop</CardTitle>
              <CardDescription>
                Edit your Claude config file, add the server block, then quit and reopen Claude.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Open <strong>Claude &rsaquo; Settings &rsaquo; Developer &rsaquo; Edit Config</strong>
                  , or edit the file directly:
                  <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                    <li>
                      macOS:{" "}
                      <code>~/Library/Application Support/Claude/claude_desktop_config.json</code>
                    </li>
                    <li>
                      Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code>
                    </li>
                  </ul>
                </li>
                <li>Merge the block below into the JSON (create the file if it doesn't exist):</li>
              </ol>
              <CodeBlock id="claude-json" code={claudeJson} />
              <ol className="list-decimal space-y-2 pl-5" start={3}>
                <li>Quit Claude completely and reopen it.</li>
                <li>
                  Start a new chat — the tool icon shows <strong>swmm5plus</strong> with 7 tools.
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chatgpt" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ChatGPT (custom connector)</CardTitle>
              <CardDescription>
                Available on ChatGPT plans that expose the Connectors / MCP UI (Pro, Business,
                Enterprise, Edu).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Open{" "}
                  <a
                    className="inline-flex items-center gap-1 text-primary underline"
                    href="https://chatgpt.com/#settings/Connectors"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Settings &rsaquo; Connectors <ExternalLink className="h-3 w-3" />
                  </a>
                  .
                </li>
                <li>
                  Click <strong>Add</strong> (or <strong>Advanced &rsaquo; Developer mode</strong>{" "}
                  &rsaquo; <strong>Create</strong>).
                </li>
                <li>
                  Name: <code>SWMM5+ Repo Explorer</code>. MCP server URL:
                </li>
              </ol>
              <CodeBlock id="chatgpt-url" code={url} />
              <ol className="list-decimal space-y-2 pl-5" start={4}>
                <li>
                  Authentication: <strong>No authentication</strong>. Accept the "I trust this
                  application" checkbox and save.
                </li>
                <li>
                  In a new chat, open the <strong>+ &rsaquo; Developer tools</strong> menu and enable{" "}
                  <strong>SWMM5+ Repo Explorer</strong>.
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cursor" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cursor</CardTitle>
              <CardDescription>
                Add the server via Cursor's MCP settings or by editing{" "}
                <code>~/.cursor/mcp.json</code>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <ol className="list-decimal space-y-2 pl-5">
                <li>
                  Open <strong>Cursor Settings &rsaquo; MCP &rsaquo; Add new global MCP server</strong>
                  , or edit <code>~/.cursor/mcp.json</code> directly.
                </li>
                <li>Paste the block below and save:</li>
              </ol>
              <CodeBlock id="cursor-json" code={cursorJson} />
              <ol className="list-decimal space-y-2 pl-5" start={3}>
                <li>
                  Back in the MCP settings pane, toggle <strong>swmm5plus</strong> on — the tool
                  list should populate within a few seconds.
                </li>
                <li>
                  In Composer / Chat, ask something like{" "}
                  <em>"Use swmm5plus to list all hydraulics modules."</em>
                </li>
              </ol>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="curl" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test with curl</CardTitle>
              <CardDescription>
                Streamable HTTP requires both <code>application/json</code> and{" "}
                <code>text/event-stream</code> in the <code>Accept</code> header.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeBlock
                id="curl-list"
                code={`curl -sS -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}
              />
              <CodeBlock
                id="curl-call"
                code={`curl -sS -X POST ${url} \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{
    "jsonrpc":"2.0","id":2,"method":"tools/call",
    "params":{"name":"search_modules","arguments":{"query":"face"}}
  }'`}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available tools</CardTitle>
          <CardDescription>All read-only. No user data, no writes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {TOOLS.map((t) => (
              <li key={t.name} className="grid grid-cols-[minmax(0,220px)_1fr] items-baseline gap-4 py-2">
                <code className="font-mono text-xs">{t.name}</code>
                <span className="text-muted-foreground">{t.desc}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Public server notice</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          This MCP endpoint is intentionally public — anyone on the internet with the URL above can
          call these tools. All tools are read-only and expose only the SWMM5+ GitHub repo plus the
          curated paper list bundled with this app; no private or per-user data is reachable through
          them.
        </CardContent>
      </Card>
    </main>
  );
}
