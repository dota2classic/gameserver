export interface ExpectedConfig {
  redis: {
    host: string;
    password: string;
  };
  postgres: {
    host: string;
    username: string;
    password: string;
  };
  telemetry: {
    jaeger: {
      url: string;
    };
  };
  fluentbit: {
    application: string;
  };
}

export default (): ExpectedConfig => {
  return {
    redis: {
      host: process.env.REDIS_HOST,
      password: process.env.REDIS_PASSWORD,
    },
    postgres: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || "5432"),
      username: process.env.POSTGRES_USERNAME,
      password: process.env.POSTGRES_PASSWORD,
    },
    telemetry: {
      jaeger: {
        url: process.env.JAEGER_URL || "http://localhost:4317",
      },
      prometheus: {
        user: process.env.PROMETHEUS_USER,
        password: process.env.PROMETHEUS_PASSWORD,
      },
    },
    fluentbit: {
      application: process.env.APP_NAME,
    },
    rabbitmq: {
      host: process.env.RABBITMQ_HOST,
      port: process.env.RABBITMQ_PORT,
      user: process.env.RABBITMQ_USER,
      password: process.env.RABBITMQ_PASSWORD,
      srcds_events: process.env.RABBITMQ_SRCDS_EVENTS,
      gameserver_commands: process.env.RABBITMQ_GAMESERVER_COMMANDS,
    },
    // Optional: add a generic app mode if needed
    app: {
      prod:
        process.env.NODE_ENV === "production" || process.env.PROD === "true",
    },
  } as ExpectedConfig;
};
