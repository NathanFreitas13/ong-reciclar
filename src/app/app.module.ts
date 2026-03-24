import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { StudentsModule } from '../modules/students/students.module';
import { AttendanceModule } from '../modules/attendance/attendance.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),
    FirebaseModule,
    StudentsModule,
    AttendanceModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
