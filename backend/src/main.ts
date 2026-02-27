import cookieParser from 'cookie-parser';
export function bootstrap(app:any){
  app.use(cookieParser());
}