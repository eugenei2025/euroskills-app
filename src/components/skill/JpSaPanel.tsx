import { useSkillJpSaInfo } from '@/hooks/useJuryPresidents'
import type { GlobalJuryPresident, GlobalSkillsAdvisor } from '@/types/database'

interface JpSaPanelProps {
  skillId: string
}

function PersonCard({
  label,
  person,
  colour,
}: {
  label: string
  person: GlobalJuryPresident | GlobalSkillsAdvisor
  colour: 'indigo' | 'violet' | 'teal'
}) {
  const name = [person.first_name, person.family_name].filter(Boolean).join(' ')
  const colourMap = {
    indigo: { badge: 'bg-indigo-100 text-indigo-700', header: 'bg-indigo-50 text-indigo-800', border: 'border-indigo-200' },
    violet: { badge: 'bg-violet-100 text-violet-700', header: 'bg-violet-50 text-violet-800', border: 'border-violet-200' },
    teal:   { badge: 'bg-teal-100 text-teal-700',     header: 'bg-teal-50 text-teal-800',     border: 'border-teal-200'   },
  }
  const c = colourMap[colour]

  return (
    <div className={`border rounded-lg overflow-hidden ${c.border}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-3 py-2 ${c.header}`}>
        <span className={`text-xs font-bold uppercase tracking-wide`}>{label}</span>
        {person.iso_code && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${c.badge}`}>
            {person.iso_code}
          </span>
        )}
      </div>
      {/* Details */}
      <div className="px-3 py-3 bg-white text-xs space-y-1.5">
        <p className="font-semibold text-gray-800 text-sm">{name}</p>
        {person.email && (
          <p className="text-gray-600 truncate">
            <span className="text-gray-400 mr-1">✉</span>
            <a href={`mailto:${person.email}`} className="hover:underline text-blue-600">{person.email}</a>
          </p>
        )}
        {person.phone && (
          <p className="text-gray-600">
            <span className="text-gray-400 mr-1">✆</span>
            {person.phone}
          </p>
        )}
      </div>
    </div>
  )
}

export function JpSaPanel({ skillId }: JpSaPanelProps) {
  const { jps, jptls, sas } = useSkillJpSaInfo(skillId)

  const hasAny = jps.length > 0 || jptls.length > 0 || sas.length > 0

  if (!hasAny) {
    return (
      <div className="border border-dashed border-indigo-100 rounded-lg px-4 py-3 text-xs text-gray-400 italic">
        No JP, JPTL or SA assigned to this skill yet — use{' '}
        <strong>Settings → Jury Presidents &amp; SAs</strong> to allocate.
      </div>
    )
  }

  return (
    <div className="mt-5 space-y-3">
      <h3 className="text-sm font-semibold text-gray-700">Assigned JP / JPTL / SA</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {jptls.map(p => (
          <PersonCard key={p.id} label="JPTL" person={p} colour="violet" />
        ))}
        {jps.map(p => (
          <PersonCard key={p.id} label="Jury President" person={p} colour="indigo" />
        ))}
        {sas.map(p => (
          <PersonCard key={p.id} label="Skills Advisor" person={p} colour="teal" />
        ))}
      </div>
    </div>
  )
}
