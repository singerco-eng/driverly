-- Allow users to read their own profile (needed before custom JWT claims are set up)
CREATE POLICY "Users can read their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());
