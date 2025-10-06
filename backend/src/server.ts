import express from 'express';
import uploadRoutes from './routes/uploadRoutes';
import processRoutes from './routes/processRoutes';
import performanceRoutes from './routes/performanceRoutes';
import { errorHandler } from './middleware/errorHandler';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api', uploadRoutes);
app.use('/api', processRoutes);
app.use('/api', performanceRoutes);

// Error Handling Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
