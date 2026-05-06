{{/*
Common name
*/}}
{{- define "goodtribes.name" -}}
goodtribes
{{- end }}

{{/*
Common labels
*/}}
{{- define "goodtribes.labels" -}}
app.kubernetes.io/managed-by: Helm
app.kubernetes.io/part-of: goodtribes
{{- end }}

{{/*
Selector labels
*/}}
{{- define "goodtribes.selectorLabels" -}}
app.kubernetes.io/name: {{ . }}
app.kubernetes.io/part-of: goodtribes
{{- end }}
