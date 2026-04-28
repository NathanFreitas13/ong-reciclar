import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { FirebaseModule } from '../../firebase/firebase.module';
import { AuthGuard } from '../../guards/auth.guard';

@Module({
  imports: [FirebaseModule],
  controllers: [DashboardController],
  providers: [DashboardService, AuthGuard],
})
export class DashboardModule {}
