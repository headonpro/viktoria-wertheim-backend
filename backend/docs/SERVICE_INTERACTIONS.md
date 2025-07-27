# Service Interaction Diagrams

## Overview

This document provides detailed diagrams and explanations of how services interact within the refactored lifecycle hooks system.

## Service Interaction Patterns

### 1. Hook Execution Flow

```mermaid
sequenceDiagram
    participant Strapi as Strapi CMS
    participant Router as Hook Router
    participant Factory as Service Factory
    participant Service as Hook Service
    participant Validator as Validation Service
    participant Calculator as Calculation Service
    participant Queue as Job Queue
    participant Monitor as Monitoring

    Strapi->>Router: CRUD Operation
    Router->>Factory: Get Service Instance
    Factory->>Service: Create/Retrieve Service
    Service->>Validator: Validate Data
    Validator-->>Service: Validation Result
    
    alt Critical Validation Failed
        Service-->>Strapi: Block Operation
    else Validation Passed
        Service->>Calculator: Sync Calculations
        Calculator-->>Service: Calculation Result
        Service->>Queue: Schedule Async Jobs
        Service->>Monitor: Log Execution
        Service-->>Strapi: Continue Operation
    end
```

### 2. Validation Service Interaction

```mermaid
graph TD
    A[Hook Service] --> B[Validation Service]
    B --> C[Rule Registry]
    C --> D[Team Rules]
    C --> E[Season Rules]
    C --> F[Table Rules]
    
    B --> G[Result Handler]
    G --> H[Critical Results]
    G --> I[Warning Results]
    
    H --> J[Block Operation]
    I --> K[Log & Continue]
    
    B --> L[Configuration Manager]
    L --> M[Feature Flags]
    L --> N[Environment Config]
```

### 3. Calculation Service Flow

```mermaid
graph LR
    A[Hook Service] --> B[Calculation Service]
    B --> C{Calculation Type}
    
    C -->|Sync| D[Immediate Calculation]
    C -->|Async| E[Job Scheduler]
    
    D --> F[Field Updates]
    E --> G[Background Queue]
    
    G --> H[Job Worker]
    H --> I[Execute Calculation]
    I --> J[Update Database]
    J --> K[Notify Completion]
    
    B --> L[Error Handler]
    L --> M[Fallback Values]
    L --> N[Retry Logic]
```

### 4. Configuration System Interaction

```mermaid
graph TB
    A[Service Initialization] --> B[Configuration Loader]
    B --> C[Schema Validator]
    C --> D[Environment Detection]
    
    D --> E[Development Config]
    D --> F[Staging Config]
    D --> G[Production Config]
    
    E --> H[Configuration Manager]
    F --> H
    G --> H
    
    H --> I[Version Control]
    H --> J[Update Manager]
    H --> K[Cache Manager]
    
    K --> L[Redis Cache]
    K --> M[Memory Cache]
```

### 5. Background Job Processing

```mermaid
sequenceDiagram
    participant Hook as Hook Service
    participant Scheduler as Job Scheduler
    participant Queue as Job Queue
    participant Worker as Job Worker
    participant DB as Database
    participant Monitor as Job Monitor

    Hook->>Scheduler: Schedule Calculation
    Scheduler->>Queue: Add Job to Queue
    Queue->>Worker: Assign Job
    Worker->>DB: Execute Calculation
    DB-->>Worker: Return Results
    Worker->>DB: Update Records
    Worker->>Monitor: Report Completion
    Monitor->>Hook: Notify Success
```

## Service Dependencies

### Core Service Dependencies

```mermaid
graph TD
    A[HookServiceFactory] --> B[BaseHookService]
    B --> C[ValidationService]
    B --> D[CalculationService]
    B --> E[ConfigurationManager]
    B --> F[StructuredLogger]
    
    C --> G[ValidationRuleRegistry]
    C --> H[ValidationResultHandler]
    
    D --> I[BackgroundJobQueue]
    D --> J[CalculationErrorHandler]
    
    E --> K[FeatureFlagService]
    E --> L[ConfigurationLoader]
    
    F --> M[PerformanceMonitor]
    F --> N[ErrorTracker]
```

### Content-Type Service Dependencies

```mermaid
graph LR
    A[TeamHookService] --> B[BaseHookService]
    A --> C[TeamValidationRules]
    A --> D[TeamCalculations]
    
    E[SaisonHookService] --> B
    E --> F[SaisonValidationRules]
    E --> G[SeasonManager]
    
    H[TableHookService] --> B
    H --> I[TableValidationRules]
    H --> J[TableCalculations]
    
    B --> K[ValidationService]
    B --> L[CalculationService]
    B --> M[ConfigurationManager]
```

## Data Flow Patterns

### 1. Team Creation Flow

```mermaid
flowchart TD
    A[Team Creation Request] --> B[TeamHookService.beforeCreate]
    B --> C[Validate Team Name Uniqueness]
    C --> D{Validation Result}
    
    D -->|Pass| E[Calculate Initial Statistics]
    D -->|Fail| F[Return Error]
    
    E --> G[Schedule Background Jobs]
    G --> H[Update Team Rankings]
    G --> I[Recalculate League Stats]
    
    H --> J[Complete Operation]
    I --> J
    F --> K[Block Operation]
```

### 2. Season Overlap Validation Flow

```mermaid
flowchart TD
    A[Season Update Request] --> B[SaisonHookService.beforeUpdate]
    B --> C[Load Season Configuration]
    C --> D[Check Overlap Validation Enabled]
    
    D -->|Enabled| E[Validate Date Ranges]
    D -->|Disabled| F[Skip Validation]
    
    E --> G{Overlap Detected}
    G -->|Yes| H[Check Severity Level]
    G -->|No| I[Continue Operation]
    
    H --> J{Critical or Warning}
    J -->|Critical| K[Block Operation]
    J -->|Warning| L[Log Warning & Continue]
    
    F --> I
    L --> I
    I --> M[Complete Operation]
```

### 3. Table Calculation Flow

```mermaid
flowchart TD
    A[Table Entry Update] --> B[TableHookService.beforeUpdate]
    B --> C[Validate Table Data]
    C --> D[Calculate Points]
    D --> E[Calculate Goal Difference]
    E --> F[Update Immediate Fields]
    
    F --> G[Schedule Background Jobs]
    G --> H[Recalculate League Table]
    G --> I[Update Team Rankings]
    G --> J[Generate Statistics]
    
    H --> K[Job Queue]
    I --> K
    J --> K
    
    K --> L[Background Processing]
    L --> M[Database Updates]
    M --> N[Completion Notification]
```

## Error Handling Patterns

### 1. Error Classification and Recovery

```mermaid
graph TD
    A[Error Occurs] --> B[Error Classifier]
    B --> C{Error Type}
    
    C -->|Critical| D[Critical Error Handler]
    C -->|Warning| E[Warning Error Handler]
    C -->|Info| F[Info Error Handler]
    
    D --> G[Block Operation]
    D --> H[Log Critical Error]
    D --> I[Send Alert]
    
    E --> J[Log Warning]
    E --> K[Continue Operation]
    E --> L[Apply Fallback]
    
    F --> M[Log Info]
    F --> N[Continue Silently]
```

### 2. Timeout and Retry Pattern

```mermaid
sequenceDiagram
    participant Service as Hook Service
    participant Timeout as Timeout Handler
    participant Retry as Retry Manager
    participant Operation as Target Operation

    Service->>Timeout: Execute with Timeout
    Timeout->>Operation: Start Operation
    
    alt Operation Completes
        Operation-->>Timeout: Success
        Timeout-->>Service: Return Result
    else Timeout Occurs
        Timeout->>Retry: Handle Timeout
        Retry->>Operation: Retry Operation
        
        alt Retry Succeeds
            Operation-->>Retry: Success
            Retry-->>Service: Return Result
        else Max Retries Exceeded
            Retry-->>Service: Return Timeout Error
        end
    end
```

## Monitoring Integration Patterns

### 1. Performance Monitoring Flow

```mermaid
graph LR
    A[Hook Execution] --> B[Performance Monitor]
    B --> C[Execution Timer]
    B --> D[Memory Monitor]
    B --> E[Resource Monitor]
    
    C --> F[Metrics Collector]
    D --> F
    E --> F
    
    F --> G[Dashboard API]
    F --> H[Alerting System]
    
    G --> I[Real-time Dashboard]
    H --> J[Notification Service]
```

### 2. Error Tracking Integration

```mermaid
graph TD
    A[Error Occurs] --> B[Error Tracker]
    B --> C[Error Categorization]
    B --> D[Context Collection]
    B --> E[Stack Trace Analysis]
    
    C --> F[Error Database]
    D --> F
    E --> F
    
    F --> G[Error Analytics]
    F --> H[Alert Generator]
    
    G --> I[Error Dashboard]
    H --> J[Notification System]
```

## Configuration Management Patterns

### 1. Configuration Loading and Caching

```mermaid
sequenceDiagram
    participant Service as Hook Service
    participant Config as Configuration Manager
    participant Cache as Configuration Cache
    participant Loader as Configuration Loader
    participant Storage as Configuration Storage

    Service->>Config: Get Configuration
    Config->>Cache: Check Cache
    
    alt Cache Hit
        Cache-->>Config: Return Cached Config
        Config-->>Service: Return Configuration
    else Cache Miss
        Config->>Loader: Load Configuration
        Loader->>Storage: Read Config Files
        Storage-->>Loader: Return Config Data
        Loader-->>Config: Parsed Configuration
        Config->>Cache: Store in Cache
        Config-->>Service: Return Configuration
    end
```

### 2. Feature Flag Evaluation

```mermaid
graph TD
    A[Feature Check Request] --> B[Feature Flag Service]
    B --> C[Flag Cache]
    C --> D{Cache Hit}
    
    D -->|Yes| E[Return Cached Value]
    D -->|No| F[Load from Storage]
    
    F --> G[Database Storage]
    F --> H[File Storage]
    
    G --> I[Evaluate Flag]
    H --> I
    
    I --> J[Apply Rules]
    J --> K[Return Result]
    K --> L[Update Cache]
```

## Integration Patterns

### 1. Strapi Integration

```mermaid
graph LR
    A[Strapi Lifecycle] --> B[Hook Registration]
    B --> C[Service Factory]
    C --> D[Dependency Injection]
    
    D --> E[Configuration Service]
    D --> F[Validation Service]
    D --> G[Calculation Service]
    D --> H[Monitoring Service]
    
    E --> I[Strapi Config]
    F --> J[Content Type Schema]
    G --> K[Database Connection]
    H --> L[Strapi Logger]
```

### 2. Database Integration

```mermaid
graph TD
    A[Hook Service] --> B[Database Manager]
    B --> C[Connection Pool]
    B --> D[Transaction Manager]
    B --> E[Query Optimizer]
    
    C --> F[PostgreSQL Connection]
    D --> G[ACID Compliance]
    E --> H[Query Cache]
    
    F --> I[Database Operations]
    G --> I
    H --> I
    
    I --> J[Result Processing]
    J --> K[Data Transformation]
    K --> L[Return to Service]
```

These interaction patterns ensure that the refactored lifecycle hooks system maintains clear separation of concerns, provides robust error handling, and enables efficient monitoring and maintenance of the system.