require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const http       = require('http');         // needed to attach Socket.io
const path       = require('path');
const jwt        = require('jsonwebtoken');
const { Server } = require('socket.io');

// Apollo GraphQL
const { ApolloServer } = require('apollo-server-express');
const typeDefs  = require('./graphql/typeDefs');
const { resolvers } = require('./graphql/resolvers');

// Socket.io setup function
const setupSocket = require('./socket');

const { sequelize } = require('./models');

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── REST API Routes ───────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/registrations', require('./routes/registrations'));
app.use('/api/categories',    require('./routes/categories'));
app.use('/api/ai',            require('./routes/ai'));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (!req.path.startsWith('/graphql')) {
    console.log('404 hit:', req.method, req.url);
    res.status(404).json({ success: false, message: 'Route not found.' });
  }
});

// ── Apollo GraphQL Server ─────────────────────────────────────────────────────
const startApolloServer = async () => {
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,

    // Context: runs on every GraphQL request
    // Extracts JWT token and attaches user to context
    context: ({ req }) => {
      const authHeader = req?.headers?.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

      let user = null;
      if (token) {
        try {
          user = jwt.verify(token, process.env.JWT_SECRET);
        } catch {
          // Token invalid or expired — user stays null
        }
      }
      return { user };
    },

    // Show GraphQL Playground in development
    introspection: true,
    playground: true,
  });

  await apolloServer.start();

  // Sync database
  await sequelize.sync();

  // Mount GraphQL at /graphql endpoint
  apolloServer.applyMiddleware({ app, path: '/graphql', cors: false });

  console.log(`✅ GraphQL ready at http://localhost:${PORT}/graphql`);
};

// ── HTTP Server + Socket.io ───────────────────────────────────────────────────
// Must create an HTTP server manually so Socket.io can attach to it
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Initialize all Socket.io event handlers
setupSocket(io);

// ── Start Everything ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

startApolloServer().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Campus Connect running on port ${PORT}`);
    console.log(`📡 REST API:    http://localhost:${PORT}/api`);
    console.log(`🔮 GraphQL:     http://localhost:${PORT}/graphql`);
    console.log(`🔌 WebSockets:  ws://localhost:${PORT}`);
  });
});