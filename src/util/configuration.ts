import { readFileSync } from 'fs';
import * as yaml from 'js-yaml';
import { join } from 'path';

const YAML_CONFIG_FILENAME = "config.yaml";

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
    host: string;
    port: number;
  };
}

export default (): ExpectedConfig => {
  return yaml.load(
    readFileSync(join("./", YAML_CONFIG_FILENAME), "utf8"),
  ) as ExpectedConfig;
};
