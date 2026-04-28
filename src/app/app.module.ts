import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { StudentsModule } from '../modules/students/students.module';
import { AttendanceModule } from '../modules/attendance/attendance.module';
import { AuthModule } from '../modules/auth/auth.module';
import { ClassesModule } from '../modules/classes/classes.module';
import { DashboardModule } from '../modules/dashboard/dashboard.module';
import { AuthGuard } from '../guards/auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    StudentsModule,
    AttendanceModule,
    AuthModule,
    ClassesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
