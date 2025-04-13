# Q-up Frontend

The React-based frontend for the Q-up gaming social platform. This project is built with Vite, React, and Material UI.

## Features

- Modern, responsive user interface
- User authentication and profile management
- Social feed with posts, comments, and likes
- Real-time chat functionality
- Game and rank management
- User search and discovery
- Mobile-friendly design

## Tech Stack

- **React 18**: Modern UI library
- **Material UI**: Component library for consistent design
- **Vite**: Fast build tool and development server
- **React Router DOM**: For navigation and routing
- **Axios**: For API requests
- **Formik & Yup**: For form handling and validation
- **JWT Authentication**: For secure user authentication
- **React Hot Toast**: For user notifications

## Development Setup

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- Visual Studio Code (recommended IDE)

### Recommended VS Code Extensions

For optimal frontend development, install these VS Code extensions:

1. **ES7+ React/Redux/React-Native snippets** - Useful React code snippets
2. **ESLint** - JavaScript linting
3. **Prettier** - Code formatting
4. **Material-UI Snippets** - Snippets for Material UI components
5. **Auto Import** - Automatically finds and imports components
6. **Path Intellisense** - Autocompletes filenames
7. **Error Lens** - Shows errors inline

### Installation

1. Clone the repository:

```bash
git clone https://github.com/chipppo/Q-up.git
cd Q-up/frontend
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

The development server will start at http://localhost:5173

## Project Structure

- `src/api/` - API service configurations and axios instances
- `src/assets/` - Static assets like images and icons
- `src/components/` - Reusable UI components
- `src/context/` - React context for global state management
- `src/pages/` - Main application views
  - `auth/` - Authentication pages (login, register, etc.)
  - `chat/` - Chat functionality
  - `dashboard/` - User dashboard
  - `feed/` - Social feed
  - `profile/` - User profile
  - `search/` - Search functionality
- `src/styles/` - Global CSS and theme configurations
- `src/utils/` - Utility functions and helpers

## Building for Production

To create a production build:

```bash
npm run build
```

This will generate a `dist` directory with optimized production files.

## Configuration

The application uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```
VITE_API_URL=http://localhost:8000  # For development
# VITE_API_URL=https://q-up.fun     # For production
```

## Deployment

See the main [deployment guide](../deployment_guide.md) for instructions on how to deploy the frontend alongside the backend.

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Test your changes thoroughly
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file in the root directory for details.