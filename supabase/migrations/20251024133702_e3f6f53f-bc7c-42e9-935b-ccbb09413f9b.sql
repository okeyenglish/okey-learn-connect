-- SEO Auto-generation Infrastructure
-- Этап 1: Таблицы, индексы и функции для автоматической генерации SEO-контента

-- Включаем необходимые расширения
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Источники ключевых слов
CREATE TABLE IF NOT EXISTS kw_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('wordstat','webmaster','internal_search','competitor','manual')),
  payload jsonb NOT NULL,
  organization_id uuid REFERENCES organizations(id),
  collected_at timestamptz DEFAULT now()
);

CREATE INDEX idx_kw_sources_org ON kw_sources(organization_id);
CREATE INDEX idx_kw_sources_collected ON kw_sources(collected_at DESC);

-- Нормализованные ключевые фразы
CREATE TABLE IF NOT EXISTS kw_norm (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase text NOT NULL,
  region text DEFAULT '213',
  monthly_searches integer,
  difficulty numeric(3,2) CHECK (difficulty >= 0 AND difficulty <= 1),
  intent text CHECK (intent IN ('info','commercial','local','transactional')),
  trend numeric(4,2) DEFAULT 1.00,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(phrase, region, organization_id)
);

CREATE INDEX idx_kw_norm_phrase_trgm ON kw_norm USING gin (phrase gin_trgm_ops);
CREATE INDEX idx_kw_norm_score ON kw_norm(monthly_searches DESC, difficulty ASC);
CREATE INDEX idx_kw_norm_org ON kw_norm(organization_id);

-- Кластеры запросов
CREATE TABLE IF NOT EXISTS kw_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  head_term text NOT NULL,
  members jsonb NOT NULL DEFAULT '[]',
  intent text CHECK (intent IN ('info','commercial','local','transactional')),
  score numeric(10,2),
  status text DEFAULT 'new' CHECK (status IN ('new','planned','drafted','published','skipped','reoptimize')),
  branch text,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_kw_clusters_status ON kw_clusters(status, score DESC);
CREATE INDEX idx_kw_clusters_branch ON kw_clusters(branch) WHERE branch IS NOT NULL;
CREATE INDEX idx_kw_clusters_slug_trgm ON kw_clusters USING gin (slug gin_trgm_ops);
CREATE INDEX idx_kw_clusters_org ON kw_clusters(organization_id);

-- Идеи контента
CREATE TABLE IF NOT EXISTS content_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id uuid REFERENCES kw_clusters(id) ON DELETE CASCADE,
  idea_type text NOT NULL CHECK (idea_type IN ('article','landing','hub','faq','category','compare','local')),
  title text NOT NULL,
  h1 text NOT NULL,
  route text UNIQUE NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  score numeric(10,2),
  branch text,
  status text DEFAULT 'planned' CHECK (status IN ('planned','briefed','drafted','published','reoptimize','rejected')),
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_content_ideas_status ON content_ideas(status, score DESC);
CREATE INDEX idx_content_ideas_route_trgm ON content_ideas USING gin (route gin_trgm_ops);
CREATE INDEX idx_content_ideas_cluster ON content_ideas(cluster_id);
CREATE INDEX idx_content_ideas_org ON content_ideas(organization_id);

-- Черновики и публикации
CREATE TABLE IF NOT EXISTS content_docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid REFERENCES content_ideas(id) ON DELETE CASCADE,
  version integer DEFAULT 1,
  html text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}',
  word_count integer,
  quality jsonb,
  published_at timestamptz,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_content_docs_idea ON content_docs(idea_id);
CREATE INDEX idx_content_docs_published ON content_docs(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_content_docs_org ON content_docs(organization_id);

-- Метрики для реоптимизации
CREATE TABLE IF NOT EXISTS content_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES content_docs(id) ON DELETE CASCADE,
  date date DEFAULT CURRENT_DATE,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  ctr numeric(5,2),
  avg_position numeric(5,2),
  time_on_page integer,
  bounce_rate numeric(5,2),
  scroll_depth numeric(5,2),
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(content_id, date)
);

CREATE INDEX idx_content_metrics_content ON content_metrics(content_id, date DESC);
CREATE INDEX idx_content_metrics_org ON content_metrics(organization_id);

-- Граф внутренних ссылок
CREATE TABLE IF NOT EXISTS internal_link_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_route text NOT NULL,
  to_route text NOT NULL,
  anchor text NOT NULL,
  link_type text DEFAULT 'contextual' CHECK (link_type IN ('contextual','navigation','footer','sidebar')),
  strength numeric(3,2) DEFAULT 1.00,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(from_route, to_route, anchor)
);

CREATE INDEX idx_link_graph_from ON internal_link_graph(from_route);
CREATE INDEX idx_link_graph_to ON internal_link_graph(to_route);
CREATE INDEX idx_link_graph_org ON internal_link_graph(organization_id);

-- Логи заданий
CREATE TABLE IF NOT EXISTS seo_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('started','success','failed','partial')),
  details jsonb DEFAULT '{}',
  error_message text,
  duration_ms integer,
  organization_id uuid REFERENCES organizations(id),
  executed_at timestamptz DEFAULT now()
);

CREATE INDEX idx_seo_job_logs_job ON seo_job_logs(job_name, executed_at DESC);
CREATE INDEX idx_seo_job_logs_org ON seo_job_logs(organization_id);

-- Очередь публикаций
CREATE TABLE IF NOT EXISTS publication_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES content_docs(id) ON DELETE CASCADE,
  scheduled_at timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','published','failed','cancelled')),
  attempts integer DEFAULT 0,
  last_error text,
  organization_id uuid REFERENCES organizations(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pub_queue_scheduled ON publication_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_pub_queue_org ON publication_queue(organization_id);

-- Расчет приоритета кластера
CREATE OR REPLACE FUNCTION calculate_cluster_score(
  p_monthly_searches integer,
  p_difficulty numeric,
  p_business_value numeric DEFAULT 0.5,
  p_trend numeric DEFAULT 1.0
) RETURNS numeric AS $$
BEGIN
  RETURN (ln(1 + p_monthly_searches) * (1 - p_difficulty) * (0.5 + 0.5 * p_business_value) * p_trend)::numeric(10,2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Поиск похожих routes
CREATE OR REPLACE FUNCTION find_similar_routes(
  p_route text,
  p_threshold numeric DEFAULT 0.3
)
RETURNS TABLE(route text, similarity real) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.route,
    similarity(ci.route, p_route) as sim
  FROM content_ideas ci
  WHERE ci.route != p_route
    AND similarity(ci.route, p_route) > p_threshold
  ORDER BY sim DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;

-- Поиск слабых страниц
CREATE OR REPLACE FUNCTION find_weak_seo_pages(
  p_min_position numeric DEFAULT 15,
  p_max_ctr numeric DEFAULT 1.0,
  p_min_bounce numeric DEFAULT 70,
  p_min_days integer DEFAULT 14
)
RETURNS TABLE(
  idea_id uuid,
  route text,
  avg_position numeric,
  avg_ctr numeric,
  avg_bounce numeric,
  days_since_publish integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.id,
    ci.route,
    AVG(cm.avg_position)::numeric(5,2) as avg_position,
    AVG(cm.ctr)::numeric(5,2) as avg_ctr,
    AVG(cm.bounce_rate)::numeric(5,2) as avg_bounce,
    (CURRENT_DATE - cd.published_at::date) as days_since_publish
  FROM content_ideas ci
  JOIN content_docs cd ON cd.idea_id = ci.id
  JOIN content_metrics cm ON cm.content_id = cd.id
  WHERE ci.status = 'published'
    AND cd.published_at < (NOW() - (p_min_days || ' days')::interval)
  GROUP BY ci.id, ci.route, cd.published_at
  HAVING 
    AVG(cm.avg_position) > p_min_position OR
    AVG(cm.ctr) < p_max_ctr OR
    AVG(cm.bounce_rate) > p_min_bounce
  ORDER BY AVG(cm.avg_position) DESC, AVG(cm.ctr) ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

-- Триггер для updated_at
CREATE OR REPLACE FUNCTION update_seo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_kw_norm_updated_at BEFORE UPDATE ON kw_norm FOR EACH ROW EXECUTE FUNCTION update_seo_updated_at();
CREATE TRIGGER update_kw_clusters_updated_at BEFORE UPDATE ON kw_clusters FOR EACH ROW EXECUTE FUNCTION update_seo_updated_at();
CREATE TRIGGER update_content_ideas_updated_at BEFORE UPDATE ON content_ideas FOR EACH ROW EXECUTE FUNCTION update_seo_updated_at();
CREATE TRIGGER update_link_graph_updated_at BEFORE UPDATE ON internal_link_graph FOR EACH ROW EXECUTE FUNCTION update_seo_updated_at();

-- RLS Policies
ALTER TABLE kw_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE kw_norm ENABLE ROW LEVEL SECURITY;
ALTER TABLE kw_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_link_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE publication_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view SEO data" ON kw_sources FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can view keywords" ON kw_norm FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can view clusters" ON kw_clusters FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can view ideas" ON content_ideas FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can view docs" ON content_docs FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can view metrics" ON content_metrics FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can view links" ON internal_link_graph FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can view logs" ON seo_job_logs FOR SELECT USING (organization_id = get_user_organization_id());
CREATE POLICY "Users can view queue" ON publication_queue FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Admins manage all SEO" ON kw_sources FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage keywords" ON kw_norm FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage clusters" ON kw_clusters FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage ideas" ON content_ideas FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage docs" ON content_docs FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage metrics" ON content_metrics FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage links" ON internal_link_graph FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage queue" ON publication_queue FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));