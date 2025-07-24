export default ({ env }) => ({
  level: env('LOG_LEVEL', 'info'),
});