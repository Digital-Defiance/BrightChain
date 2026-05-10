/**
 * OrderList Component
 *
 * Displays a unified list of FHIR R4 ServiceRequest and MedicationRequest
 * resources with type icons, status/priority styling, and filtering.
 *
 * @module orders/OrderList
 */
import type {
  IMedicationRequestResource,
  IServiceRequestResource,
} from '@brightchain/brightchart-lib';
import {
  MedicationRequestStatus,
  RequestPriority,
  ServiceRequestStatus,
} from '@brightchain/brightchart-lib';
import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useBrightChartTranslation } from '../hooks/useBrightChartTranslation';

/** Union type for orders displayed in the list. */
export type OrderResource =
  | IServiceRequestResource<string>
  | IMedicationRequestResource<string>;

/** Filter value for order type. */
export type OrderTypeFilter = 'all' | 'service-request' | 'medication-request';

export interface OrderListProps {
  /** Array of ServiceRequest and/or MedicationRequest resources. */
  orders: OrderResource[];
  /** Callback when an order is selected. */
  onSelect: (order: OrderResource) => void;
  /** Optional pre-set filter for order types. */
  filterTypes?: OrderTypeFilter;
  /** Optional pre-set filter for statuses. */
  filterStatuses?: string[];
}

/** Icons for order types (text-based for portability). */
const ORDER_TYPE_ICONS: Record<string, string> = {
  ServiceRequest: '🔬',
  MedicationRequest: '💊',
};

/** Human-readable labels for order types. */
const ORDER_TYPE_LABELS: Record<string, string> = {
  ServiceRequest: 'Service Request',
  MedicationRequest: 'Prescription',
};

/** All statuses across both resource types for the filter dropdown. */
const ALL_STATUSES: string[] = [
  ...Object.values(ServiceRequestStatus),
  ...Object.values(MedicationRequestStatus).filter(
    (s) => !(Object.values(ServiceRequestStatus) as string[]).includes(s),
  ),
];

/** All priorities for the filter dropdown. */
const ALL_PRIORITIES: string[] = Object.values(RequestPriority);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isServiceRequest(
  order: OrderResource,
): order is IServiceRequestResource<string> {
  return order.resourceType === 'ServiceRequest';
}

function getCodeDisplay(order: OrderResource): string {
  if (isServiceRequest(order)) {
    return order.code?.text ?? order.code?.coding?.[0]?.display ?? 'Unknown';
  }
  return (
    order.medicationCodeableConcept?.text ??
    order.medicationCodeableConcept?.coding?.[0]?.display ??
    'Unknown'
  );
}

function getDate(order: OrderResource): string {
  return order.authoredOn ?? '';
}

function getRequester(order: OrderResource): string {
  return order.requester?.display ?? order.requester?.reference ?? '';
}

function getStatus(order: OrderResource): string {
  return order.status;
}

function getPriority(order: OrderResource): string {
  return order.priority ?? RequestPriority.Routine;
}

/**
 * Returns CSS modifier class(es) for status-based styling.
 * - active → highlighted
 * - completed → muted
 * - revoked / cancelled → struck-through
 */
function statusModifier(status: string): string {
  switch (status) {
    case ServiceRequestStatus.Active:
    case MedicationRequestStatus.Active:
      return 'order-list__item--active';
    case ServiceRequestStatus.Completed:
    case MedicationRequestStatus.Completed:
      return 'order-list__item--completed';
    case ServiceRequestStatus.Revoked:
    case MedicationRequestStatus.Cancelled:
      return 'order-list__item--revoked';
    default:
      return '';
  }
}

/**
 * Returns CSS modifier class for priority-based styling.
 * - stat → red
 * - urgent → orange
 */
function priorityModifier(priority: string): string {
  switch (priority) {
    case RequestPriority.Stat:
      return 'order-list__priority--stat';
    case RequestPriority.Urgent:
      return 'order-list__priority--urgent';
    default:
      return '';
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const OrderList: React.FC<OrderListProps> = ({
  orders,
  onSelect,
  filterTypes: initialTypeFilter,
  filterStatuses: initialStatusFilter,
}) => {
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>(
    initialTypeFilter ?? 'all',
  );
  const { tEnum } = useBrightChartTranslation();

  const orderStatusLabel = useCallback(
    (order: OrderResource) => {
      if (isServiceRequest(order))
        return tEnum(ServiceRequestStatus, order.status);
      return tEnum(MedicationRequestStatus, order.status);
    },
    [tEnum],
  );

  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatusFilter?.[0] ?? 'all',
  );
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Type filter
      if (
        typeFilter === 'service-request' &&
        order.resourceType !== 'ServiceRequest'
      )
        return false;
      if (
        typeFilter === 'medication-request' &&
        order.resourceType !== 'MedicationRequest'
      )
        return false;

      // Status filter
      if (statusFilter !== 'all' && getStatus(order) !== statusFilter)
        return false;

      // Priority filter
      if (priorityFilter !== 'all' && getPriority(order) !== priorityFilter)
        return false;

      return true;
    });
  }, [orders, typeFilter, statusFilter, priorityFilter]);

  const handleSelect = useCallback(
    (order: OrderResource) => {
      onSelect(order);
    },
    [onSelect],
  );

  return (
    <div className="order-list" role="region" aria-label="Order List">
      {/* Filters */}
      <div className="order-list__filters">
        <div className="order-list__filter">
          <label htmlFor="order-list-type-filter">Type</label>
          <select
            id="order-list-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as OrderTypeFilter)}
          >
            <option value="all">All Types</option>
            <option value="service-request">Service Requests</option>
            <option value="medication-request">Prescriptions</option>
          </select>
        </div>

        <div className="order-list__filter">
          <label htmlFor="order-list-status-filter">Status</label>
          <select
            id="order-list-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="order-list__filter">
          <label htmlFor="order-list-priority-filter">Priority</label>
          <select
            id="order-list-priority-filter"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {tEnum(RequestPriority, p)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Order Items */}
      {filteredOrders.length === 0 ? (
        <p className="order-list__empty">
          No orders match the current filters.
        </p>
      ) : (
        <ul className="order-list__items" role="list">
          {filteredOrders.map((order, index) => {
            const status = getStatus(order);
            const priority = getPriority(order);
            const itemClasses = [
              'order-list__item',
              statusModifier(status),
              priorityModifier(priority),
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <li key={order.id ?? index} className={itemClasses}>
                <button
                  type="button"
                  className="order-list__item-button"
                  onClick={() => handleSelect(order)}
                  aria-label={`Select ${ORDER_TYPE_LABELS[order.resourceType] ?? order.resourceType}: ${getCodeDisplay(order)}`}
                >
                  <span className="order-list__icon" aria-hidden="true">
                    {ORDER_TYPE_ICONS[order.resourceType] ?? '📋'}
                  </span>
                  <span className="order-list__code">
                    {getCodeDisplay(order)}
                  </span>
                  <span className="order-list__status">
                    {orderStatusLabel(order)}
                  </span>
                  <span
                    className={`order-list__priority ${priorityModifier(priority)}`}
                  >
                    {tEnum(RequestPriority, priority)}
                  </span>
                  <span className="order-list__date">{getDate(order)}</span>
                  <span className="order-list__requester">
                    {getRequester(order)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
