import { css } from '@emotion/core';
import { Button, Pagination, Result, Table, Tag } from 'antd';
import classNames from 'classnames';
import produce from 'immer';
import qs from 'qs';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { Link, useHistory, useLocation, useRouteMatch } from 'react-router-dom';
import { Icon, ListSearchInput } from '.';
import apis from '../apis';
import { APIInsightProject, APIInsightUserProject } from '../apis/insight';
import { usePagination } from '../hooks';
import { FC, Team } from '../interfaces';
import { AppState } from '../store';
import style from '../style';
import { toLowerCamelCase } from '../utils';

const { Column } = Table;

/** 项目用户分析的属性接口 */
interface TeamInsightProjectListProps {
  team: Team;
  className?: string;
}
/**
 * 项目用户分析
 */
export const TeamInsightProjectList: FC<TeamInsightProjectListProps> = ({
  team,
  className,
}) => {
  const platform = useSelector((state: AppState) => state.site.platform);
  const isMobile = platform === 'mobile';
  const { formatMessage } = useIntl(); // i18n
  const [word, setWord] = useState<string>();
  const { url } = useRouteMatch();
  const history = useHistory();
  const location = useLocation();
  const queryString = qs.parse(location.search, { ignoreQueryPrefix: true });

  const defaultPage =
    queryString.page && parseInt(queryString.page as string) > 0
      ? parseInt(queryString.page as string)
      : 1;

  interface APIInsightProjectWithPage extends APIInsightProject {
    usersLoading?: boolean;
    usersPage?: number;
  }
  const {
    items,
    setItems,
    page,
    setPage,
    total,
    limit,
    status,
    refresh,
  } = usePagination<
    APIInsightProjectWithPage,
    Parameters<typeof apis.getTeamInsightProjects>[0]
  >({
    api: apis.getTeamInsightProjects,
    apiParams: { teamID: team.id, params: { word: word } },
    defaultPage,
    defaultLimit: 10,
  });

  const handleLoadMoreClick = ({
    project,
    index,
  }: {
    project: APIInsightUserProject;
    index: number;
  }): void => {
    const usersPage = items[index].usersPage;
    const page = usersPage ? usersPage : 1;
    setItems(
      produce((draft) => {
        draft[index].usersLoading = true;
      })
    );
    apis
      .getTeamInsightProjectUsers({
        teamID: team.id,
        projectID: project.id,
        params: { page, limit: 20 },
      })
      .then((result) => {
        const data = toLowerCamelCase(result.data);
        setItems(
          produce((draft) => {
            draft[index].usersLoading = false;
            draft[index].usersPage = page + 1;
            if (page === 1) {
              draft[index].users = data;
            } else {
              draft[index].users.push(...data);
            }
          })
        );
      });
  };

  return (
    <div
      className={classNames(['TeamInsightProjectList', className])}
      css={css`
        width: 100%;
        .TeamInsightProjectList__Name {
          word-break: break-all;
        }
        .TeamInsightProjectList__Pagination {
          text-align: center;
          margin-top: 15px;
          margin-bottom: 25px;
        }
        .TeamInsightProjectList__NoWorkingProjects {
          color: ${style.textColorSecondary};
        }
        .TeamInsightProjectList__ProjectSetToProjectIcon {
          color: ${style.textColorSecondary};
        }
        .TeamInsightProjectList__Project {
          margin: 3px 0;
        }
        .TeamInsightProjectList__MoreProjectsTip {
          color: ${style.textColorSecondary};
        }
      `}
    >
      {status !== 'failure' && (
        <ListSearchInput
          size={isMobile ? 'middle' : 'small'}
          onSearch={(word) => {
            setPage(1);
            setWord(word);
          }}
          placeholder={formatMessage({ id: 'site.projectName' })}
        />
      )}
      {status !== 'failure' && (
        <Table
          className="TeamInsightProjectList__Table"
          loading={status === 'loading'}
          dataSource={items}
          rowKey={(record) => record.project.id}
          pagination={false}
        >
          <Column
            title={formatMessage({ id: 'site.projectName' })}
            key="project"
            width="30%"
            render={(text, record: APIInsightProjectWithPage, index) => {
              return (
                <Link
                  className="TeamInsightProjectList__Name"
                  to={`/dashboard/teams/${team.id}/project-sets/${record.project.projectSet.id}/projects/${record.project.id}/setting/invitation`}
                >
                  {record.project.name}
                </Link>
              );
            }}
          />
          <Column
            title={formatMessage({ id: 'site.member' })}
            key="users"
            render={(text, record: APIInsightProjectWithPage, index) => {
              return (
                <div>
                  <div>
                    {record.users.length === 0 && (
                      <span className="TeamInsightProjectList__NoWorkingProjects">
                        {formatMessage({ id: 'insight.noUserInProjects' })}
                      </span>
                    )}
                    {record.users.map((user) => {
                      return (
                        <div
                          key={user.id}
                          className="TeamInsightProjectList__Project"
                        >
                          <span className="TeamInsightProjectList__Name">
                            {user.name}
                          </span>{' '}
                          <Tag>{user.role.name}</Tag>
                        </div>
                      );
                    })}
                  </div>
                  {record.count > record.users.length && (
                    <div>
                      <span className="TeamInsightProjectList__MoreProjectsTip">
                        {formatMessage(
                          { id: 'insight.moreProject' },
                          { count: record.count - record.users.length }
                        )}
                      </span>
                      <Button
                        icon={
                          <Icon
                            icon="caret-down"
                            style={{ marginRight: '5px' }}
                          />
                        }
                        onClick={() => {
                          handleLoadMoreClick({
                            project: record.project,
                            index,
                          });
                        }}
                        loading={record.usersLoading}
                        type="link"
                        size="small"
                        className="TeamInsightProjectList__LoadMoreProjects"
                      >
                        {formatMessage({ id: 'site.loadMore' })}
                      </Button>
                    </div>
                  )}
                </div>
              );
            }}
          />
        </Table>
      )}
      {status === 'failure' && (
        <Result
          className="TeamInsightProjectList__NetworkError"
          status="warning"
          title={formatMessage({ id: 'api.networkError' })}
          extra={
            <Button type="ghost" onClick={refresh}>
              {formatMessage({ id: 'site.refresh' })}
            </Button>
          }
        />
      )}
      {status !== 'failure' && (
        <Pagination
          className="TeamInsightProjectList__Pagination"
          total={total}
          pageSize={limit}
          current={page}
          onChange={(page) => {
            setPage(page);
            history.replace({
              pathname: url,
              search: '?' + qs.stringify({ page: page.toString() }),
            });
          }}
          showSizeChanger={false}
        />
      )}
    </div>
  );
};
