-- Create table for storing in-app notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- System can insert notifications (using service role in edge functions)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);

-- Add realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to notify team members when a goal is created
CREATE OR REPLACE FUNCTION public.notify_team_goal_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_member RECORD;
  team_name TEXT;
BEGIN
  -- Get team name
  SELECT name INTO team_name FROM public.teams WHERE id = NEW.team_id;
  
  -- Get all users who have players on this team
  FOR team_member IN
    SELECT DISTINCT p.owner_user_id as user_id
    FROM public.team_memberships tm
    JOIN public.players p ON p.id = tm.player_id
    WHERE tm.team_id = NEW.team_id AND tm.status = 'active'
  LOOP
    INSERT INTO public.notifications (user_id, title, message, notification_type, metadata)
    VALUES (
      team_member.user_id,
      'New Team Goal! 🎯',
      'A new goal has been set: ' || NEW.name || '. Target: ' || NEW.target_value || ' ' || NEW.goal_type,
      'goal_created',
      jsonb_build_object('goal_id', NEW.id, 'team_id', NEW.team_id, 'team_name', team_name)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for goal creation
CREATE TRIGGER on_team_goal_created
AFTER INSERT ON public.team_goals
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_goal_created();

-- Create function to notify team members when a goal is achieved
CREATE OR REPLACE FUNCTION public.notify_team_goal_achieved()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_member RECORD;
  team_name TEXT;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Get team name
    SELECT name INTO team_name FROM public.teams WHERE id = NEW.team_id;
    
    -- Get all users who have players on this team
    FOR team_member IN
      SELECT DISTINCT p.owner_user_id as user_id
      FROM public.team_memberships tm
      JOIN public.players p ON p.id = tm.player_id
      WHERE tm.team_id = NEW.team_id AND tm.status = 'active'
    LOOP
      INSERT INTO public.notifications (user_id, title, message, notification_type, metadata)
      VALUES (
        team_member.user_id,
        'Goal Achieved! 🏆',
        'Congratulations! Your team reached the goal: ' || NEW.name,
        'goal_achieved',
        jsonb_build_object('goal_id', NEW.id, 'team_id', NEW.team_id, 'team_name', team_name)
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for goal achievement
CREATE TRIGGER on_team_goal_achieved
AFTER UPDATE ON public.team_goals
FOR EACH ROW
EXECUTE FUNCTION public.notify_team_goal_achieved();