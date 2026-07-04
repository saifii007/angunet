#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const project = {
  ui: {
    path: 'angunet-ui',
    devUrl: 'http://localhost:4200',
    start: ['cd angunet-ui', 'npm start'],
  },
  api: {
    path: 'angunet-server/angunet-API',
    httpUrl: 'http://localhost:5260',
    httpsUrl: 'https://localhost:7094',
    start: ['cd angunet-server/angunet-API', 'dotnet run --launch-profile http'],
  },
  docker: {
    start: ['docker compose up --build'],
    uiUrl: 'http://localhost:4200',
    apiUrl: 'http://localhost:8080',
    proxyPath: '/api',
  },
};

const resources = [
  {
    uri: 'angunet://overview',
    name: 'ANGUNET overview',
    mimeType: 'text/markdown',
    description: 'High-level map of the ANGUNET workspace.',
  },
  {
    uri: 'angunet://startup',
    name: 'Startup commands',
    mimeType: 'text/markdown',
    description: 'Commands for starting the API, UI, Docker stack, and MCP server.',
  },
  {
    uri: 'angunet://environment',
    name: 'Environment URLs',
    mimeType: 'application/json',
    description: 'Frontend and backend URLs used by the local and Docker environments.',
  },
];

const tools = [
  {
    name: 'get_start_commands',
    description: 'Return commands for starting ANGUNET locally, with Docker, and as an MCP server.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'get_environment_urls',
    description: 'Return the UI, API, Docker, and proxy URLs for this project.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'list_project_structure',
    description: 'Return the top-level ANGUNET folders and their purpose.',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
];

let buffer = Buffer.alloc(0);

process.stdin.on('data', (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);
  readMessages();
});

process.stdin.on('end', () => process.exit(0));

function readMessages() {
  while (buffer.length > 0) {
    const headerEnd = buffer.indexOf('\r\n\r\n');

    if (headerEnd !== -1) {
      const header = buffer.slice(0, headerEnd).toString('utf8');
      const match = header.match(/Content-Length:\s*(\d+)/i);

      if (!match) {
        buffer = buffer.slice(headerEnd + 4);
        continue;
      }

      const length = Number(match[1]);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + length;

      if (buffer.length < messageEnd) {
        return;
      }

      const rawMessage = buffer.slice(messageStart, messageEnd).toString('utf8');
      buffer = buffer.slice(messageEnd);
      handleRawMessage(rawMessage);
      continue;
    }

    const newline = buffer.indexOf('\n');
    if (newline === -1) {
      return;
    }

    const rawMessage = buffer.slice(0, newline).toString('utf8').trim();
    buffer = buffer.slice(newline + 1);
    if (rawMessage) {
      handleRawMessage(rawMessage);
    }
  }
}

function handleRawMessage(rawMessage) {
  let message;

  try {
    message = JSON.parse(rawMessage);
  } catch (error) {
    sendError(null, -32700, 'Parse error');
    return;
  }

  if (!message.id && message.id !== 0) {
    return;
  }

  try {
    const result = handleRequest(message.method, message.params || {});
    sendMessage({ jsonrpc: '2.0', id: message.id, result });
  } catch (error) {
    sendError(message.id, error.code || -32603, error.message || 'Internal error');
  }
}

function handleRequest(method, params) {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: params.protocolVersion || '2025-06-18',
        capabilities: {
          resources: {},
          tools: {},
          prompts: {},
        },
        serverInfo: {
          name: 'angunet-mcp-server',
          version: '0.1.0',
        },
      };

    case 'resources/list':
      return { resources };

    case 'resources/read':
      return readResource(params.uri);

    case 'tools/list':
      return { tools };

    case 'tools/call':
      return callTool(params.name);

    case 'prompts/list':
      return {
        prompts: [
          {
            name: 'start-angunet',
            description: 'Explain how to start the ANGUNET workspace.',
            arguments: [],
          },
        ],
      };

    case 'prompts/get':
      return getPrompt(params.name);

    default:
      throw Object.assign(new Error(`Method not found: ${method}`), { code: -32601 });
  }
}

function readResource(uri) {
  if (uri === 'angunet://overview') {
    return textResource(uri, [
      '# ANGUNET',
      '',
      'ANGUNET combines an Angular frontend with an ASP.NET Core backend.',
      '',
      '- `angunet-ui`: Angular application served locally on http://localhost:4200.',
      '- `angunet-server/angunet-API`: .NET API served locally on http://localhost:5260.',
      '- `docker-compose.yml`: production-like stack with API on port 8080 and web on port 4200.',
      '- `mcp-server`: local MCP server for project startup guidance.',
    ].join('\n'));
  }

  if (uri === 'angunet://startup') {
    return textResource(uri, formatStartCommands());
  }

  if (uri === 'angunet://environment') {
    return {
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(getEnvironmentUrls(), null, 2),
        },
      ],
    };
  }

  throw Object.assign(new Error(`Unknown resource: ${uri}`), { code: -32602 });
}

function callTool(name) {
  if (name === 'get_start_commands') {
    return toolText(formatStartCommands());
  }

  if (name === 'get_environment_urls') {
    return toolText(JSON.stringify(getEnvironmentUrls(), null, 2));
  }

  if (name === 'list_project_structure') {
    return toolText(getProjectStructure().join('\n'));
  }

  throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32602 });
}

function getPrompt(name) {
  if (name !== 'start-angunet') {
    throw Object.assign(new Error(`Unknown prompt: ${name}`), { code: -32602 });
  }

  return {
    description: 'Explain how to start the ANGUNET workspace.',
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: 'Use the ANGUNET MCP resources to explain how to start the UI, API, Docker stack, and MCP server.',
        },
      },
    ],
  };
}

function formatStartCommands() {
  return [
    '# Start ANGUNET',
    '',
    'API:',
    project.api.start.join('\n'),
    `OpenAPI endpoint: ${project.api.httpUrl}/openapi/v1.json`,
    '',
    'Angular UI:',
    project.ui.start.join('\n'),
    `Open UI: ${project.ui.devUrl}`,
    '',
    'Docker stack:',
    project.docker.start.join('\n'),
    `Web: ${project.docker.uiUrl}`,
    `API: ${project.docker.apiUrl}`,
    `Nginx API proxy: ${project.docker.proxyPath}`,
    '',
    'MCP server:',
    'node mcp-server/server.js',
  ].join('\n');
}

function getEnvironmentUrls() {
  return {
    angularDevServer: project.ui.devUrl,
    apiHttp: project.api.httpUrl,
    apiHttps: project.api.httpsUrl,
    dockerWeb: project.docker.uiUrl,
    dockerApi: project.docker.apiUrl,
    dockerProxyPath: project.docker.proxyPath,
  };
}

function getProjectStructure() {
  const entries = [
    ['angunet-ui', 'Angular frontend application'],
    ['angunet-server', 'ASP.NET Core backend solution'],
    ['shared', 'Shared workspace assets'],
    ['mcp-server', 'Project MCP server'],
    ['docker-compose.yml', 'Docker stack for API and web'],
  ];

  return entries.map(([relativePath, description]) => {
    const exists = fs.existsSync(path.join(repoRoot, relativePath)) ? 'present' : 'missing';
    return `${relativePath} - ${description} (${exists})`;
  });
}

function textResource(uri, text) {
  return {
    contents: [
      {
        uri,
        mimeType: 'text/markdown',
        text,
      },
    ],
  };
}

function toolText(text) {
  return {
    content: [
      {
        type: 'text',
        text,
      },
    ],
  };
}

function sendError(id, code, message) {
  sendMessage({
    jsonrpc: '2.0',
    id,
    error: {
      code,
      message,
    },
  });
}

function sendMessage(message) {
  const json = JSON.stringify(message);
  const payload = `Content-Length: ${Buffer.byteLength(json, 'utf8')}\r\n\r\n${json}`;
  process.stdout.write(payload);
}
