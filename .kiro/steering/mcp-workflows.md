# MCP Server Workflows & Proactive Usage

## Available MCP Servers

The following MCP servers are configured and should be used proactively based on context:

### 1. Filesystem Server
**Purpose**: Extended file system operations beyond workspace
**Proactive Usage**:
- When user mentions working with files outside the project (Downloads, Desktop, Documents)
- For backup/restore operations
- When importing/exporting data from external locations
- File organization tasks across multiple directories

### 2. Fetch Server (@kazuph/mcp-fetch)
**Purpose**: Web content retrieval and image processing
**Proactive Usage**:
- When researching football/soccer APIs or documentation
- Fetching external content for integration (league data, team info)
- Image processing for club logos or player photos
- Monitoring competitor websites or football data sources
- Documentation research for libraries/frameworks

**Key Features**:
- Image processing with base64 return for Claude
- Automatic image saving to Downloads
- Content extraction as markdown

### 3. Puppeteer Server
**Purpose**: Browser automation and web scraping
**Proactive Usage**:
- Testing frontend components in real browsers
- Scraping football league tables or match data
- Automated testing of user workflows
- Screenshot generation for documentation
- Performance testing of web pages

### 4. Sequential Thinking Server
**Purpose**: Complex problem-solving with structured thinking
**Proactive Usage**:
- Complex database migration planning
- Multi-step feature implementation planning
- Debugging complex issues with multiple variables
- Architecture decisions requiring analysis
- Performance optimization strategies

### 5. Playwright Server
**Purpose**: Advanced browser automation and testing
**Proactive Usage**:
- E2E testing implementation
- Cross-browser compatibility testing
- Advanced user interaction testing
- Mobile responsiveness testing
- Accessibility testing automation

### 6. MongoDB Server
**Purpose**: MongoDB database operations
**Proactive Usage**:
- If project switches to MongoDB
- Data migration from PostgreSQL to MongoDB
- NoSQL data modeling discussions
- Performance comparisons between databases

### 7. PostgreSQL Server
**Purpose**: Advanced PostgreSQL operations
**Proactive Usage**:
- Database schema optimization
- Complex query analysis and optimization
- Database performance monitoring
- Migration management
- Index optimization
- User and permission management
- Database debugging and troubleshooting

**Key Operations**:
- Schema management (tables, indexes, constraints)
- Query performance analysis with EXPLAIN
- User and role management
- Data import/export operations
- Database monitoring and statistics

### 8. Clerk Server
**Purpose**: Authentication and user management
**Proactive Usage**:
- When implementing user authentication
- User management features
- Session handling
- Role-based access control
- Integration with Strapi authentication

### 9. MagicUI Server
**Purpose**: Modern UI component library
**Proactive Usage**:
- When creating new UI components
- Enhancing existing components with animations
- Mobile-first component implementations
- Special effects and animations
- Button and interaction components

**Component Categories**:
- Animations (blur-fade)
- Text animations (animated-gradient-text, typing-animation)
- Buttons (shimmer-button, interactive-hover-button)
- Backgrounds (animated-grid-pattern, ripple)
- Special effects (animated-beam, particles, confetti)
- Device mocks (safari, iphone-15-pro)

## Proactive Workflow Triggers

### Database Operations
**Trigger**: Any mention of database issues, performance, or schema changes
**Action**: Use PostgreSQL server for:
- Performance analysis
- Schema optimization
- Query debugging
- Migration planning

### Frontend Development
**Trigger**: UI/UX improvements, component creation, animations
**Action**: Use MagicUI server for:
- Component inspiration and implementation
- Animation patterns
- Mobile-first design patterns

### Testing & Quality Assurance
**Trigger**: Testing discussions, bug reports, performance issues
**Action**: Use Playwright/Puppeteer for:
- Automated testing implementation
- Performance testing
- Cross-browser validation

### External Data Integration
**Trigger**: Need for external data, APIs, or content
**Action**: Use Fetch server for:
- API documentation research
- Data source exploration
- Content integration

### Complex Problem Solving
**Trigger**: Multi-step problems, architecture decisions, debugging
**Action**: Use Sequential Thinking for:
- Structured problem analysis
- Step-by-step solution planning
- Decision tree analysis

### Authentication & User Management
**Trigger**: User-related features, authentication issues
**Action**: Use Clerk server for:
- User management operations
- Authentication flow implementation
- Session handling

## Context-Specific Workflows

### Football Club Website Context
Given this is a football club website, prioritize:

1. **PostgreSQL Server**: For Strapi database optimization and club/player data management
2. **MagicUI Server**: For mobile-first UI components and animations
3. **Fetch Server**: For researching football APIs and league data sources
4. **Playwright Server**: For mobile-responsive testing
5. **Sequential Thinking**: For complex feature planning

### Mobile-First Development Priority
Always consider mobile performance and UX when using:
- MagicUI components (mobile-optimized)
- Playwright testing (mobile viewports)
- Performance monitoring (mobile metrics)

## Auto-Approval Recommendations

Consider adding these tools to autoApprove for smoother workflows:
- `mcp_postgresql_pg_execute_query` (for read-only operations)
- `mcp_magicui_getUIComponents` (for component discovery)
- `mcp_fetch_imageFetch` (for content research)
- `mcp_sequential_thinking_sequentialthinking` (for problem analysis)

## Integration Patterns

### Database + UI Workflow
1. Use PostgreSQL server to analyze data structure
2. Use MagicUI server to create appropriate display components
3. Use Playwright server to test the complete flow

### Research + Implementation Workflow
1. Use Fetch server to research solutions/APIs
2. Use Sequential Thinking for implementation planning
3. Use appropriate servers for implementation
4. Use Playwright for testing

### Performance Optimization Workflow
1. Use PostgreSQL server for database performance analysis
2. Use Playwright for frontend performance testing
3. Use Sequential Thinking for optimization strategy
4. Implement optimizations using appropriate tools